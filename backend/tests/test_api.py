import pytest
import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AI Software Dependency Risk Analyzer" in data["service"]

# --- SUPPORTED FILE UPLOAD TESTS ---

def test_upload_supported_package_json():
    content = b'{"name": "npm-demo", "dependencies": {"express": "4.16.0"}}'
    response = client.post("/api/scan", files={"file": ("package.json", content, "application/json")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "package.json"
    assert data["ecosystem"] == "npm"

def test_upload_supported_package_lock_json():
    content = b'{"name": "npm-lock-demo", "packages": {"": {"dependencies": {"qs": "6.5.1"}}}}'
    response = client.post("/api/scan", files={"file": ("package-lock.json", content, "application/json")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "package-lock.json"
    assert data["ecosystem"] == "npm"

def test_upload_supported_requirements_txt():
    content = b"flask==0.12.2\nrequests==2.20.0"
    response = client.post("/api/scan", files={"file": ("requirements.txt", content, "text/plain")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "requirements.txt"
    assert data["ecosystem"] == "PyPI"

def test_upload_supported_requirements_lock_txt():
    content = b"django==2.2.0\nurllib3==1.24.1"
    response = client.post("/api/scan", files={"file": ("requirements-lock.txt", content, "text/plain")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "requirements-lock.txt"
    assert data["ecosystem"] == "PyPI"

def test_upload_supported_pom_xml():
    content = b"""<project xmlns="http://maven.apache.org/POM/4.0.0">
      <modelVersion>4.0.0</modelVersion>
      <groupId>com.example</groupId>
      <artifactId>demo</artifactId>
      <version>1.0.0</version>
      <dependencies>
        <dependency>
          <groupId>org.apache.logging.log4j</groupId>
          <artifactId>log4j-core</artifactId>
          <version>2.14.1</version>
        </dependency>
      </dependencies>
    </project>"""
    response = client.post("/api/scan", files={"file": ("pom.xml", content, "application/xml")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "pom.xml"
    assert data["ecosystem"] == "Maven"

def test_upload_supported_yarn_lock():
    content = b'lodash@^4.17.15:\n  version "4.17.15"\n'
    response = client.post("/api/scan", files={"file": ("yarn.lock", content, "text/plain")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "yarn.lock"
    assert data["ecosystem"] == "npm"

# --- INVALID UPLOAD EDGE CASES ---

def test_upload_invalid_python_script():
    response = client.post("/api/scan", files={"file": ("main.py", b"print('hello')", "text/x-python")})
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_upload_invalid_pdf():
    response = client.post("/api/scan", files={"file": ("document.pdf", b"%PDF-1.4 header", "application/pdf")})
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_upload_invalid_zip():
    response = client.post("/api/scan", files={"file": ("archive.zip", b"PK\x03\x04", "application/zip")})
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_upload_invalid_docx():
    response = client.post("/api/scan", files={"file": ("report.docx", b"PK\x03\x04docx", "application/vnd.openxmlformats-officedocument")})
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_upload_empty_file():
    response = client.post("/api/scan/text", json={"filename": "package.json", "content": "   "})
    assert response.status_code == 400
    assert "Dependency content cannot be empty" in response.json()["detail"]

def test_upload_file_exceeding_5mb_limit():
    large_content = b"a" * (5 * 1024 * 1024 + 100)  # > 5MB
    response = client.post("/api/scan", files={"file": ("package.json", large_content, "application/json")})
    assert response.status_code == 400
    assert "exceeds maximum allowed limit" in response.json()["detail"]

# --- PERFORMANCE & CACHING TESTS ---

def test_repeated_scan_sqlite_caching():
    payload = {
        "filename": "package.json",
        "content": '{"name": "cache-test", "dependencies": {"express": "4.16.0"}}'
    }
    # First scan
    start1 = time.time()
    res1 = client.post("/api/scan/text", json=payload)
    t1 = time.time() - start1
    assert res1.status_code == 200

    # Second scan (cached in SQLite)
    start2 = time.time()
    res2 = client.post("/api/scan/text", json=payload)
    t2 = time.time() - start2
    assert res2.status_code == 200
    assert res1.json()["total_deps"] == res2.json()["total_deps"]

# --- SCAN HISTORY & DELETION TESTS ---

def test_past_scans_list_get_and_delete():
    list_res = client.get("/api/scans")
    assert list_res.status_code == 200
    scans = list_res.json()
    assert isinstance(scans, list)
    
    if len(scans) > 0:
        scan_id = scans[0]["id"]
        detail_res = client.get(f"/api/scans/{scan_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == scan_id

def test_get_nonexistent_scan():
    response = client.get("/api/scans/non-existent-uuid-9999")
    assert response.status_code == 404
    assert "Scan record not found" in response.json()["detail"]

def test_delete_nonexistent_scan():
    response = client.delete("/api/scans/non-existent-uuid-9999")
    assert response.status_code == 404
    assert "Scan record not found" in response.json()["detail"]
