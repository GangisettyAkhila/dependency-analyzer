from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DependencyItem(BaseModel):
    name: str
    version: str
    raw_version: Optional[str] = None
    ecosystem: str
    depth: str = "direct"
    parent: Optional[str] = None
    published_at: Optional[str] = None
    is_deprecated: bool = False
    deprecation_reason: Optional[str] = None
    staleness: str = "Maintained"
    latest_version: Optional[str] = None
    is_vulnerable: bool = False
    vulnerabilities: List[Dict[str, Any]] = []

class ScanRequest(BaseModel):
    filename: str
    content: str

class ScanSummary(BaseModel):
    id: str
    filename: str
    ecosystem: str
    scanned_at: str
    total_deps: int
    direct_deps: int
    transitive_deps: int
    vulnerable_deps: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    risk_score: int

class ScanResultResponse(ScanSummary):
    dependencies: List[DependencyItem]
    vulnerabilities_flat: List[Dict[str, Any]]
