import json
import re
from typing import List, Dict, Any, Tuple
import defusedxml.ElementTree as ET

def clean_version(raw_version: str) -> str:
    if not raw_version:
        return "0.0.0"
    # Remove common specifiers like ^, ~, >=, ==, <=, =, etc.
    cleaned = re.sub(r'^[^\d]*', '', raw_version.strip())
    # Grab the first valid semver prefix (e.g., 1.2.3 from 1.2.3.RELEASE or 1.2.3-beta)
    match = re.search(r'^\d+(\.\d+)*', cleaned)
    if match:
        v = match.group(0)
        # ensure at least x.y.z format if possible
        parts = v.split('.')
        if len(parts) == 1:
            return f"{parts[0]}.0.0"
        elif len(parts) == 2:
            return f"{parts[0]}.{parts[1]}.0"
        return v
    return "1.0.0"

def parse_package_json(content: str) -> List[Dict[str, Any]]:
    data = json.loads(content)
    dependencies = []
    
    # Direct dependencies
    direct_deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})
    peer_deps = data.get("peerDependencies", {})
    
    seen = set()
    
    for pkg, ver in direct_deps.items():
        v = clean_version(str(ver))
        if pkg not in seen:
            seen.add(pkg)
            dependencies.append({
                "name": pkg,
                "version": v,
                "raw_version": str(ver),
                "ecosystem": "npm",
                "depth": "direct",
                "parent": None
            })
            
    for pkg, ver in dev_deps.items():
        v = clean_version(str(ver))
        if pkg not in seen:
            seen.add(pkg)
            dependencies.append({
                "name": pkg,
                "version": v,
                "raw_version": str(ver),
                "ecosystem": "npm",
                "depth": "direct",
                "parent": None
            })

    for pkg, ver in peer_deps.items():
        v = clean_version(str(ver))
        if pkg not in seen:
            seen.add(pkg)
            dependencies.append({
                "name": pkg,
                "version": v,
                "raw_version": str(ver),
                "ecosystem": "npm",
                "depth": "direct",
                "parent": None
            })
            
    return dependencies

def parse_package_lock_json(content: str) -> List[Dict[str, Any]]:
    data = json.loads(content)
    dependencies = []
    seen = set()
    
    # Check v2/v3 lockfile packages format first
    packages = data.get("packages", {})
    root_deps = set()
    
    root_pkg = packages.get("", {})
    if root_pkg:
        for d in root_pkg.get("dependencies", {}).keys():
            root_deps.add(d)
        for d in root_pkg.get("devDependencies", {}).keys():
            root_deps.add(d)
            
    if packages:
        for path, info in packages.items():
            if not path: # root app
                continue
            name = info.get("name") or path.split("node_modules/")[-1]
            ver = info.get("version", "1.0.0")
            cleaned_ver = clean_version(ver)
            
            depth = "direct" if name in root_deps or path.count("node_modules") == 1 else "transitive"
            key = f"{name}@{cleaned_ver}"
            if key not in seen:
                seen.add(key)
                dependencies.append({
                    "name": name,
                    "version": cleaned_ver,
                    "raw_version": ver,
                    "ecosystem": "npm",
                    "depth": depth,
                    "parent": "root" if depth == "direct" else path.split("node_modules/")[-2] if path.count("node_modules") > 1 else None
                })
    
    # Fallback to v1 dependencies key or root_pkg if packages had no node_modules items
    if not dependencies:
        v1_deps = data.get("dependencies", {})
        if v1_deps:
            def recurse_v1(deps_dict, is_root=True, parent_name=None):
                for name, info in deps_dict.items():
                    ver = info.get("version", "1.0.0")
                    cleaned_ver = clean_version(ver)
                    key = f"{name}@{cleaned_ver}"
                    depth = "direct" if is_root else "transitive"
                    if key not in seen:
                        seen.add(key)
                        dependencies.append({
                            "name": name,
                            "version": cleaned_ver,
                            "raw_version": ver,
                            "ecosystem": "npm",
                            "depth": depth,
                            "parent": parent_name
                        })
                    if "requires" in info or "dependencies" in info:
                        sub_deps = info.get("dependencies", {})
                        recurse_v1(sub_deps, is_root=False, parent_name=name)
            recurse_v1(v1_deps, is_root=True)
        elif root_pkg:
            all_root_deps = {**root_pkg.get("dependencies", {}), **root_pkg.get("devDependencies", {})}
            for name, ver in all_root_deps.items():
                cleaned_ver = clean_version(str(ver))
                key = f"{name}@{cleaned_ver}"
                if key not in seen:
                    seen.add(key)
                    dependencies.append({
                        "name": name,
                        "version": cleaned_ver,
                        "raw_version": str(ver),
                        "ecosystem": "npm",
                        "depth": "direct",
                        "parent": None
                    })

    return dependencies


def parse_requirements_txt(content: str) -> List[Dict[str, Any]]:
    dependencies = []
    seen = set()
    
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        
        # Match requirement lines like flask==2.0.1, requests>=2.25.0, numpy~=1.19
        parts = re.split(r'(==|>=|<=|~=|>|<|!=)', line)
        pkg = parts[0].strip()
        ver = parts[2].strip().split()[0] if len(parts) >= 3 else "1.0.0"
        cleaned_ver = clean_version(ver)
        
        if pkg and pkg not in seen:
            seen.add(pkg)
            dependencies.append({
                "name": pkg,
                "version": cleaned_ver,
                "raw_version": ver,
                "ecosystem": "PyPI",
                "depth": "direct",
                "parent": None
            })
            
    return dependencies

def parse_requirements_lock(content: str) -> List[Dict[str, Any]]:
    dependencies = []
    seen = set()
    
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        
        parts = re.split(r'(==|>=|<=|~=|>|<|!=)', line)
        pkg = parts[0].strip()
        ver = parts[2].strip().split()[0] if len(parts) >= 3 else "1.0.0"
        cleaned_ver = clean_version(ver)
        
        # Comment markers often distinguish top-level vs transitive in pip-compile outputs
        is_transitive = "via" in line.lower()
        depth = "transitive" if is_transitive else "direct"
        
        if pkg and pkg not in seen:
            seen.add(pkg)
            dependencies.append({
                "name": pkg,
                "version": cleaned_ver,
                "raw_version": ver,
                "ecosystem": "PyPI",
                "depth": depth,
                "parent": None
            })
            
    return dependencies

def parse_pom_xml(content: str) -> List[Dict[str, Any]]:
    dependencies = []
    seen = set()
    
    try:
        root = ET.fromstring(content)
    except Exception as e:
        raise ValueError(f"Invalid pom.xml file format: {str(e)}")
        
    # Remove XML namespaces if present
    for elem in root.iter():
        if '}' in elem.tag:
            elem.tag = elem.tag.split('}', 1)[1]
            
    # Parse dependencies
    for dep in root.findall(".//dependency"):
        group_id = dep.findtext("groupId")
        artifact_id = dep.findtext("artifactId")
        version = dep.findtext("version") or "1.0.0"
        scope = dep.findtext("scope") or "compile"
        
        if group_id and artifact_id:
            pkg_name = f"{group_id}:{artifact_id}"
            cleaned_ver = clean_version(version)
            
            # Check if inside dependencyManagement (often transitive/inherited constraints)
            parent_node = dep
            depth = "direct"
            
            if pkg_name not in seen:
                seen.add(pkg_name)
                dependencies.append({
                    "name": pkg_name,
                    "version": cleaned_ver,
                    "raw_version": version,
                    "ecosystem": "Maven",
                    "depth": depth,
                    "parent": None
                })
                
    return dependencies

def parse_yarn_lock(content: str) -> List[Dict[str, Any]]:
    dependencies = []
    seen = set()
    current_pkg = None

    for line in content.splitlines():
        line_str = line.strip()
        if not line_str or line_str.startswith("#"):
            continue
        if not line.startswith(" ") and "@" in line_str and line_str.endswith(":"):
            # Header line e.g., "express@^4.16.0:" or '"@babel/core@^7.0.0":'
            raw_header = line_str.rstrip(":").strip('"').strip("'")
            # Extract package name before the last @ or first @
            first_part = raw_header.split(",")[0].strip().strip('"').strip("'")
            if first_part.startswith("@"):
                parts = first_part[1:].split("@")
                pkg_name = "@" + parts[0]
            else:
                pkg_name = first_part.split("@")[0]
            current_pkg = pkg_name
        elif line_str.startswith("version ") and current_pkg:
            ver_val = line_str.split("version ", 1)[1].strip('"').strip("'")
            cleaned_ver = clean_version(ver_val)
            if current_pkg not in seen:
                seen.add(current_pkg)
                dependencies.append({
                    "name": current_pkg,
                    "version": cleaned_ver,
                    "raw_version": ver_val,
                    "ecosystem": "npm",
                    "depth": "direct",
                    "parent": None
                })
            current_pkg = None

    return dependencies

def detect_and_parse(filename: str, content: str) -> Tuple[str, List[Dict[str, Any]]]:
    fn = filename.lower()
    if fn == "package.json":
        return "npm", parse_package_json(content)
    elif fn in ["package-lock.json", "npm-shrinkwrap.json"]:
        return "npm", parse_package_lock_json(content)
    elif fn == "yarn.lock":
        return "npm", parse_yarn_lock(content)
    elif fn.endswith(".txt") and "requirements" in fn:
        if "lock" in fn or "freeze" in fn:
            return "PyPI", parse_requirements_lock(content)
        return "PyPI", parse_requirements_txt(content)
    elif fn == "pom.xml" or fn.endswith(".xml"):
        return "Maven", parse_pom_xml(content)
    else:
        # Fallback auto-detection based on content snippet
        if content.strip().startswith("{") and "dependencies" in content:
            return "npm", parse_package_json(content)
        elif "yarn lock" in content.lower() or 'version "' in content:
            return "npm", parse_yarn_lock(content)
        elif "<project" in content and "<dependency>" in content:
            return "Maven", parse_pom_xml(content)
        else:
            return "PyPI", parse_requirements_txt(content)

