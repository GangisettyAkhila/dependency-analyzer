from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ProjectCreateRequest(BaseModel):
    name: str
    ecosystem: str
    repository_url: Optional[str] = None
    user_id: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    ecosystem: str
    repository_url: Optional[str] = None
    created_at: str

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
    filename: Optional[str] = "package.json"
    content: str

class ScanSummary(BaseModel):
    id: str
    project_id: Optional[str] = "default-project"
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
    risk_label: Optional[str] = "Low"
    risk_interpretation: Optional[str] = "Limited identified dependency risk"

class ScanResultResponse(ScanSummary):
    factor_contributions: Optional[Dict[str, Any]] = None
    dependencies: List[DependencyItem]
    vulnerabilities_flat: List[Dict[str, Any]]
    ai_briefing: Optional[Dict[str, Any]] = None
