from __future__ import annotations

from dataclasses import dataclass
from http import HTTPStatus
from pathlib import Path, PureWindowsPath

from fastapi import HTTPException, UploadFile

ALLOWED_FILE_EXTENSIONS = frozenset({".txt", ".md"})
MAX_FILE_SIZE_BYTES = 10


@dataclass(frozen=True)
class StoredUpload:
    file_name: str
    stored_at: str
    size: int


def validate_file_name(file_name: str | None) -> str:
    if not file_name:
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Invalid file name")

    normalized_name = file_name.replace("\\", "/")
    if (
        normalized_name != file_name
        or "/" in normalized_name
        or PureWindowsPath(file_name).drive
        or file_name in {".", ".."}
    ):
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Invalid file name")

    if Path(file_name).suffix.lower() not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Unsupported file type")

    return file_name


async def store_upload(file: UploadFile, upload_directory: str | Path) -> StoredUpload:
    file_name = validate_file_name(file.filename)
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "File is too large")

    target = Path(upload_directory) / file_name
    try:
        with target.open("xb") as destination:
            destination.write(content)
    except FileExistsError as error:
        raise HTTPException(HTTPStatus.CONFLICT, "File already exists") from error

    return StoredUpload(file_name, str(target), len(content))
