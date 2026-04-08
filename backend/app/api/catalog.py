from fastapi import APIRouter, HTTPException

from app.models.catalog import FirestoreSyncSummary, SyncResponse
from app.services.catalog_sync import (
    UnsupportedVendorError,
    list_supported_vendors,
    sync_vendor_catalog,
)
from app.services.firestore_admin import (
    sync_catalog_products_to_firestore,
    sync_frame_style_mappings_to_firestore,
)


router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/vendors", response_model=list[str])
def get_supported_vendors() -> list[str]:
    return list_supported_vendors()


@router.post("/sync/frame-style-mappings", response_model=dict)
def sync_frame_style_mappings() -> dict:
    """Sync frame_style_mappings.json to Firestore.

    Reads the JSON file from backend/data/ and writes each frame style
    as a document in the frameStyleMappings collection.
    """
    return sync_frame_style_mappings_to_firestore()


@router.post("/sync/{vendor}", response_model=SyncResponse)
def sync_catalog(vendor: str, save_snapshot: bool = True) -> SyncResponse:
    try:
        return sync_vendor_catalog(vendor, save_snapshot=save_snapshot)
    except UnsupportedVendorError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/sync/{vendor}/firestore", response_model=FirestoreSyncSummary)
def sync_catalog_to_firestore(
    vendor: str, save_snapshot: bool = True
) -> FirestoreSyncSummary:
    try:
        response = sync_vendor_catalog(vendor, save_snapshot=save_snapshot)
        return sync_catalog_products_to_firestore(
            vendor=vendor,
            products=response.products,
            snapshot_path=response.summary.snapshot_path,
        )
    except UnsupportedVendorError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
