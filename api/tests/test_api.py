import base64
import time
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.file_storage import validate_file_name
from app.main import create_app


def token(username: str = "student", role: str = "STUDENT") -> str:
    raw = f"{username}|{role}|{int(time.time()) + 3600}|WORKSHOP_SECRET_2026"
    return base64.b64encode(raw.encode()).decode()


def headers(username: str = "student", role: str = "STUDENT") -> dict[str, str]:
    return {"Authorization": f"Bearer {token(username, role)}"}


def test_lists_seeded_tasks(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers())
    assert response.status_code == 200
    tasks = response.json()
    assert [task["id"] for task in tasks] == [1, 2]
    assert [task["title"] for task in tasks] == ["Refactor login", "Review API"]
    assert all(task["owner"] == "student" for task in tasks)


def test_owner_is_always_bound_to_identity(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        tasks = client.get("/api/tasks", params={"owner": "trainer"}, headers=headers())
        summary = client.get("/api/summary", params={"owner": "trainer"}, headers=headers())
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "External task", "description": "Owned by trainer", "owner": "trainer"},
        )
    assert tasks.status_code == 200
    assert [task["owner"] for task in tasks.json()] == ["student", "student"]
    assert summary.json()["owner"] == "student"
    assert summary.json()["total"] == 2
    assert created.status_code == 201
    assert created.json()["owner"] == "student"


def test_creates_task_and_summary(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Add tests", "description": "Improve coverage", "status": "TODO", "priority": "HIGH"},
        )
        summary = client.get("/api/summary", headers=headers())
    assert created.status_code == 201
    assert created.json()["owner"] == "student"
    assert summary.json()["total"] == 3


def test_task_creation_treats_quotes_as_data(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/tasks",
            headers=headers(),
            json={
                "title": "Reviewer's note",
                "description": "Owner's task",
                "status": "TODO",
                "priority": "LOW",
            },
        )
    assert response.status_code == 201
    assert response.json()["title"] == "Reviewer's note"
    assert response.json()["description"] == "Owner's task"


def test_characterizes_summary_counts(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/summary", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "owner": "student",
        "total": 2,
        "byStatus": {"TODO": 1, "IN_PROGRESS": 1},
        "highPriorityOpen": 1,
    }


def test_uploads_requirement(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    content = b"API docs!!"
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.txt", content, "text/plain")},
        )
    assert response.status_code == 201
    assert response.json()["owner"] == "student"
    assert response.json()["fileName"] == "requirements.txt"
    assert response.json()["storedAt"] == str(upload_dir / "requirements.txt")
    assert len(content) == 10
    assert response.json()["size"] == len(content)
    assert (upload_dir / "requirements.txt").read_bytes() == content


def test_uploads_markdown_file(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("notes.md", b"# docs", "text/markdown")},
        )
    assert response.status_code == 201
    assert response.json()["fileName"] == "notes.md"
    assert (upload_dir / "notes.md").read_bytes() == b"# docs"


def test_rejects_nested_upload_filename(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("folder/notes.txt", b"notes", "text/plain")},
        )
    assert response.status_code == 400
    assert not (upload_dir / "folder").exists()


@pytest.mark.parametrize("file_name", [None, "C:notes.txt"])
def test_rejects_invalid_file_name_values(file_name: str | None) -> None:
    with pytest.raises(HTTPException) as error:
        validate_file_name(file_name)
    assert error.value.status_code == 400


def test_rejects_unsupported_upload_extension(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("notes.pdf", b"notes", "application/pdf")},
        )
    assert response.status_code == 400
    assert not (upload_dir / "notes.pdf").exists()


def test_rejects_oversized_upload(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("large.txt", b"01234567890", "text/plain")},
        )
    assert response.status_code == 413
    assert not (upload_dir / "large.txt").exists()


def test_rejects_existing_upload_without_overwriting(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    existing_file = upload_dir / "requirements.txt"
    existing_file.write_bytes(b"first")
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.txt", b"other", "text/plain")},
        )
    assert response.status_code == 409
    assert existing_file.read_bytes() == b"first"


def test_rejects_invalid_token(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401


def test_rejects_missing_token(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks")
    assert response.status_code == 401
