import asyncio
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from database import get_cached_registry_metadata, cache_registry_metadata

logger = logging.getLogger("dep_analyzer.registry")

# Shared connection client pool with timeout limit
_CLIENT: Optional[httpx.AsyncClient] = None
_SEMAPHORE = asyncio.Semaphore(20)

def get_shared_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(2.5, connect=1.5),
            follow_redirects=True,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
        )
    return _CLIENT

async def fetch_package_metadata(name: str, version: str, ecosystem: str) -> Dict[str, Any]:
    """
    Queries registry APIs (npm, PyPI, Maven Central) to retrieve
    release date, deprecation status, and calculate package staleness.
    Uses SQLite cache before hitting network.
    """
    # 1. Check SQLite Cache First (0ms network cost)
    cached = get_cached_registry_metadata(name, version, ecosystem)
    if cached is not None:
        return cached

    result = {
        "published_at": None,
        "is_deprecated": False,
        "deprecation_reason": None,
        "staleness": "Unknown",
        "latest_version": None
    }

    client = get_shared_client()

    async with _SEMAPHORE:
        try:
            if ecosystem == "npm":
                # Use lightweight abbreviated manifest header to reduce NPM payload from ~10MB to ~5KB
                headers = {"Accept": "application/vnd.npm.install-v1+json"}
                url = f"https://registry.npmjs.org/{name}"
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    time_data = data.get("time", {})
                    latest_ver = data.get("dist-tags", {}).get("latest")
                    result["latest_version"] = latest_ver
                    
                    ver_time = time_data.get(version) or time_data.get("modified") or time_data.get(latest_ver)
                    if ver_time:
                        result["published_at"] = ver_time
                    
                    versions_data = data.get("versions", {})
                    ver_info = versions_data.get(version, {})
                    if "deprecated" in ver_info:
                        result["is_deprecated"] = True
                        result["deprecation_reason"] = str(ver_info.get("deprecated"))
                        
            elif ecosystem == "PyPI":
                url = f"https://pypi.org/pypi/{name}/json"
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    info = data.get("info", {})
                    result["latest_version"] = info.get("version")
                    
                    releases = data.get("releases", {})
                    ver_files = releases.get(version, [])
                    if ver_files and len(ver_files) > 0:
                        upload_time = ver_files[0].get("upload_time_iso_8601") or ver_files[0].get("upload_time")
                        if upload_time:
                            result["published_at"] = upload_time
                            
                    if info.get("yanked"):
                        result["is_deprecated"] = True
                        result["deprecation_reason"] = info.get("yanked_reason") or "Package version yanked on PyPI"

            elif ecosystem == "Maven":
                parts = name.split(":")
                if len(parts) == 2:
                    g, a = parts[0], parts[1]
                    url = f"https://search.maven.org/solrsearch/select?q=g:%22{g}%22+AND+a:%22{a}%22&rows=1&wt=json"
                    res = await client.get(url)
                    if res.status_code == 200:
                        docs = res.json().get("response", {}).get("docs", [])
                        if docs:
                            latest_ver = docs[0].get("latestVersion")
                            result["latest_version"] = latest_ver
                            ts = docs[0].get("timestamp")
                            if ts:
                                result["published_at"] = datetime.utcfromtimestamp(ts / 1000.0).isoformat() + "Z"
        except Exception as e:
            logger.warning(f"Error fetching registry data for {name} ({ecosystem}): {e}")

    # Calculate staleness
    if result["published_at"]:
        try:
            pub_date = datetime.fromisoformat(result["published_at"].replace("Z", "+00:00"))
            now = datetime.now(pub_date.tzinfo)
            years_old = (now - pub_date).days / 365.25
            
            if years_old > 5:
                result["staleness"] = f"Deprecated / Extremely Stale ({int(years_old)} years old)"
            elif years_old > 3:
                result["staleness"] = f"Outdated ({int(years_old)} years old)"
            elif years_old > 1:
                result["staleness"] = f"Maintained ({int(years_old)} year{'s' if int(years_old)>1 else ''} old)"
            else:
                result["staleness"] = "Recently Updated"
        except Exception:
            result["staleness"] = "Maintained"

    if result["is_deprecated"]:
        result["staleness"] = "Deprecated Package"

    # Save to SQLite registry cache
    cache_registry_metadata(name, version, ecosystem, result)
    return result

