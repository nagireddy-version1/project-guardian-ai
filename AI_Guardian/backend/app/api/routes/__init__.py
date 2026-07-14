from fastapi import APIRouter

from app.api.routes import dashboard, decisions, documents, health, settings, validation

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(documents.router)
api_router.include_router(decisions.router)
api_router.include_router(validation.router)
api_router.include_router(dashboard.router)
api_router.include_router(settings.router)
