from fastapi import APIRouter, HTTPException

from app.models.storage import (
    PresignedUploadRequest,
    PresignedUploadResponse,
    R2StatusResponse,
)
from app.services.r2_storage import (
    R2ConfigurationError,
    create_presigned_upload,
    get_r2_status,
)


router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/r2/status", response_model=R2StatusResponse)
def r2_status() -> R2StatusResponse:
    return get_r2_status()


@router.post("/r2/presign", response_model=PresignedUploadResponse)
def presign_r2_upload(
    request: PresignedUploadRequest,
) -> PresignedUploadResponse:
    try:
        return create_presigned_upload(request)
    except R2ConfigurationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
