"""Template matcher: Map product analysis to optimal template style"""

import logging

logger = logging.getLogger(__name__)

# Rule-based mapping: (category, subcategory) patterns → template style
_CATEGORY_STYLE_MAP = {
    # Luxury & fashion
    "fashion": "premium_luxury",
    "luxury": "premium_luxury",
    "jewelry": "premium_luxury",
    "watch": "premium_luxury",
    "designer": "premium_luxury",
    "handbag": "premium_luxury",
    # Tech & electronics
    "electronics": "tech_modern",
    "tech": "tech_modern",
    "gadget": "tech_modern",
    "computer": "tech_modern",
    "smartphone": "tech_modern",
    "software": "tech_modern",
    # Food & organic
    "food": "organic_natural",
    "organic": "organic_natural",
    "health": "organic_natural",
    "beauty": "organic_natural",
    "skincare": "organic_natural",
    "wellness": "organic_natural",
    "supplement": "organic_natural",
    # Youth & casual
    "sports": "bold_casual",
    "casual": "bold_casual",
    "youth": "bold_casual",
    "streetwear": "bold_casual",
    "entertainment": "bold_casual",
    "toy": "bold_casual",
    "game": "bold_casual",
}

VALID_STYLES = {"clean_minimal", "premium_luxury", "bold_casual", "tech_modern", "organic_natural"}


def match_template(analysis_result: dict) -> str:
    """Determine the best template style based on product analysis.

    Uses a hybrid approach:
    1. Rule-based category matching (fast, deterministic)
    2. AI recommendation from analysis (fallback)
    3. Default to clean_minimal

    Args:
        analysis_result: Product analysis dict with category, subcategory, tone, etc.

    Returns:
        Template style string
    """
    category = (analysis_result.get("category") or "").lower()
    subcategory = (analysis_result.get("subcategory") or "").lower()
    tone = (analysis_result.get("tone") or "").lower()
    ai_recommendation = analysis_result.get("recommended_template_style", "")

    # 1. Rule-based: check subcategory first (more specific), then category
    for term in [subcategory, category]:
        for keyword, style in _CATEGORY_STYLE_MAP.items():
            if keyword in term:
                logger.info(f"Template matched by rule: '{keyword}' in '{term}' → {style}")
                return style

    # 2. Tone-based hints
    tone_hints = {
        "premium": "premium_luxury",
        "luxury": "premium_luxury",
        "elegant": "premium_luxury",
        "modern": "tech_modern",
        "technical": "tech_modern",
        "innovative": "tech_modern",
        "natural": "organic_natural",
        "warm": "organic_natural",
        "organic": "organic_natural",
        "playful": "bold_casual",
        "energetic": "bold_casual",
        "dynamic": "bold_casual",
    }
    for keyword, style in tone_hints.items():
        if keyword in tone:
            logger.info(f"Template matched by tone: '{keyword}' → {style}")
            return style

    # 3. AI recommendation (validated)
    if ai_recommendation in VALID_STYLES:
        logger.info(f"Template matched by AI recommendation: {ai_recommendation}")
        return ai_recommendation

    # 4. Default
    logger.info("Template matched: default → clean_minimal")
    return "clean_minimal"
