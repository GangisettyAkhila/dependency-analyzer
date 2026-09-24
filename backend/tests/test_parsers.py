import pytest
from parsers import parse_package_json, parse_package_lock_json, parse_requirements_txt, parse_pom_xml, clean_version

def test_clean_version():
    assert clean_version("^4.17.15") == "4.17.15"
    assert clean_version("~2.0.1") == "2.0.1"
    assert clean_version("==1.2.3") == "1.2.3"
    assert clean_version("2.14.1.RELEASE") == "2.14.1"

def test_parse_package_json():
    content = """{
        "name": "sample-project",
        "dependencies": {
            "express": "^4.18.2",
            "lodash": "4.17.15"
        },
        "devDependencies": {
            "jest": "~29.0.0"
        }
    }"""
    deps = parse_package_json(content)
    assert len(deps) == 3
    names = [d["name"] for d in deps]
    assert "express" in names
    assert "lodash" in names
    assert "jest" in names
    for d in deps:
        assert d["depth"] == "direct"
        assert d["ecosystem"] == "npm"

def test_parse_requirements_txt():
    content = """
    flask==2.0.1
    requests>=2.25.0
    """
    deps = parse_requirements_txt(content)
    assert len(deps) == 2
    assert deps[0]["name"] == "flask"
    assert deps[0]["version"] == "2.0.1"
    assert deps[0]["ecosystem"] == "PyPI"

def test_parse_pom_xml():
    content = """<project xmlns="http://maven.apache.org/POM/4.0.0">
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
    deps = parse_pom_xml(content)
    assert len(deps) == 1
    assert deps[0]["name"] == "org.apache.logging.log4j:log4j-core"
    assert deps[0]["version"] == "2.14.1"
    assert deps[0]["ecosystem"] == "Maven"
