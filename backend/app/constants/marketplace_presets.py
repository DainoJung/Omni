"""Marketplace-specific export presets for image generation."""

MARKETPLACE_PRESETS = {
    "amazon": {
        "id": "amazon",
        "name": "Amazon A+",
        "width": 970,
        "description": "Amazon A+ Content module width",
    },
    "shopify": {
        "id": "shopify",
        "name": "Shopify",
        "width": 2048,
        "description": "Shopify product image (square)",
    },
    "coupang": {
        "id": "coupang",
        "name": "Coupang",
        "width": 780,
        "description": "Coupang product detail width",
    },
    "general": {
        "id": "general",
        "name": "General",
        "width": 860,
        "description": "Default width (860px)",
    },
}


def get_preset(preset_id: str) -> dict | None:
    return MARKETPLACE_PRESETS.get(preset_id)


def list_presets() -> list[dict]:
    return list(MARKETPLACE_PRESETS.values())
