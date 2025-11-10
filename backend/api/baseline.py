"""
Baseline API Routes

Provides endpoints for checking code against Baseline web features
to determine browser compatibility and safety.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from backend.services.baseline_checker import baseline_checker, FeatureCheck, BaselineStatus
from backend.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

class BaselineCheckRequest(BaseModel):
    code: str
    language: str
    file_path: Optional[str] = ""

class BaselineFeatureResponse(BaseModel):
    feature_name: str
    status: str
    line_number: int
    column_start: int
    column_end: int
    description: str
    browser_support: dict
    suggestion: Optional[str] = None

class BaselineCheckResponse(BaseModel):
    features: List[BaselineFeatureResponse]
    summary: dict
    
class BaselineChatRequest(BaseModel):
    query: str

class BaselineChatResponse(BaseModel):
    response: str
    
@router.post("/chat", response_model=BaselineChatResponse)
async def baseline_chat(request: BaselineChatRequest):
    """
    Interactive chat endpoint for Baseline safety queries
    """
    try:
        # Create a prompt for the AI service
        prompt = f"""
        You are a Baseline Safety Assistant specialized in web development. 
        Your task is to provide helpful information about Baseline web features, browser compatibility, 
        and how to write code that is Baseline-compliant.
        
        User query: {request.query}
        
        Provide a helpful, accurate response about Baseline compatibility. 
        If the query is about a specific web feature, include information about:
        1. Its Baseline status (if applicable)
        2. Browser compatibility
        3. Recommended alternatives if it's not Baseline-safe
        4. Code examples where appropriate
        """
        
        # Get response from AI service
        response = await ai_service.generate_text(prompt)
        
        return BaselineChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@router.post("/check", response_model=BaselineCheckResponse)
async def check_baseline_features(request: BaselineCheckRequest):
    """
    Check code for Baseline web features and return compatibility information
    """
    try:
        # Perform baseline check
        features = baseline_checker.check_code(
            code=request.code,
            language=request.language,
            file_path=request.file_path or ""
        )
        
        # Convert to response format
        feature_responses = []
        for feature in features:
            feature_responses.append(BaselineFeatureResponse(
                feature_name=feature.feature_name,
                status=feature.status.value,
                line_number=feature.line_number,
                column_start=feature.column_start,
                column_end=feature.column_end,
                description=feature.description,
                browser_support=feature.browser_support,
                suggestion=feature.suggestion
            ))
        
        # Generate summary
        summary = _generate_summary(features)
        
        return BaselineCheckResponse(
            features=feature_responses,
            summary=summary
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking baseline features: {str(e)}")

@router.get("/features")
async def get_available_features():
    """
    Get list of all available Baseline features that can be checked
    """
    try:
        features = baseline_checker.baseline_data
        return {
            "features": list(features.keys()),
            "total_count": len(features)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving features: {str(e)}")

@router.get("/feature/{feature_name}")
async def get_feature_info(feature_name: str):
    """
    Get detailed information about a specific Baseline feature
    """
    try:
        if feature_name not in baseline_checker.baseline_data:
            raise HTTPException(status_code=404, detail=f"Feature '{feature_name}' not found")
        
        feature_data = baseline_checker.baseline_data[feature_name]
        return {
            "name": feature_name,
            "status": feature_data["status"],
            "description": feature_data["description"],
            "browser_support": feature_data["support"],
            "baseline_date": feature_data.get("baseline_date"),
            "suggestion": baseline_checker.get_feature_suggestions(feature_name)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving feature info: {str(e)}")

def _generate_summary(features: List[FeatureCheck]) -> dict:
    """Generate a summary of the baseline check results"""
    if not features:
        return {
            "total_features": 0,
            "baseline_high": 0,
            "baseline_low": 0,
            "not_baseline": 0,
            "overall_status": "safe",
            "recommendations": []
        }
    
    status_counts = {
        "baseline_high": 0,
        "baseline_low": 0,
        "not_baseline": 0
    }
    
    recommendations = []
    
    for feature in features:
        status_counts[feature.status.value] += 1
        
        if feature.status == BaselineStatus.NOT_BASELINE:
            recommendations.append(f"Consider alternatives for {feature.feature_name}")
        elif feature.status == BaselineStatus.BASELINE_LOW:
            recommendations.append(f"Use {feature.feature_name} with caution - limited support")
    
    # Determine overall status
    if status_counts["not_baseline"] > 0:
        overall_status = "risky"
    elif status_counts["baseline_low"] > 0:
        overall_status = "caution"
    else:
        overall_status = "safe"
    
    return {
        "total_features": len(features),
        "baseline_high": status_counts["baseline_high"],
        "baseline_low": status_counts["baseline_low"],
        "not_baseline": status_counts["not_baseline"],
        "overall_status": overall_status,
        "recommendations": recommendations[:5]  # Limit to top 5 recommendations
    }