"""
Cognee Cloud Configuration and Integration
Handles communication with Cognee Cloud API for knowledge graph management
"""

import os
import httpx
from typing import Dict, List, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

COGNEE_API_TOKEN = os.getenv("COGNEE_API_TOKEN", "")
COGNEE_API_URL = "https://api.cognee.ai"

class CogneeConfig:
    """Configuration class for Cognee Cloud integration"""
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.api_url = COGNEE_API_URL
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    async def test_connection(self) -> bool:
        """Test connection to Cognee Cloud"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/health",
                    headers=self.headers,
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception as e:
            print(f"[v0] Cognee connection test failed: {str(e)}")
            return False

class CogneeMemoryTypes:
    """Define memory entry types for Cognee graph"""
    
    DECISION = "decision"
    GOAL = "goal"
    REASONING = "reasoning"
    REJECTED_ALTERNATIVE = "rejected_alternative"
    OUTCOME = "outcome"
    
    ALL = [DECISION, GOAL, REASONING, REJECTED_ALTERNATIVE, OUTCOME]

class CogneeDataTransformer:
    """Transform data to/from Cognee Cloud format"""
    
    @staticmethod
    def to_cognee_entry(
        entry_type: str,
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Transform to Cognee entry format"""
        return {
            "entry_type": entry_type,
            "title": title,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {
                "source": "precedent",
                "version": "1.0"
            }
        }
    
    @staticmethod
    def from_cognee_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
        """Transform from Cognee entry to frontend format"""
        return {
            "entry_id": entry.get("id") or entry.get("entry_id"),
            "entry_type": entry.get("entry_type"),
            "title": entry.get("title", ""),
            "content": entry.get("content", ""),
            "created_at": entry.get("timestamp") or entry.get("created_at"),
            "metadata": entry.get("metadata", {})
        }

class CogneeGraph:
    """Cognee Graph operations"""
    
    @staticmethod
    def create_relationship(source_id: str, target_id: str, relationship_type: str) -> Dict[str, Any]:
        """Create a relationship between two entries in the graph"""
        return {
            "source_id": source_id,
            "target_id": target_id,
            "relationship_type": relationship_type,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def create_similarity_link(entry1_id: str, entry2_id: str, score: float) -> Dict[str, Any]:
        """Create similarity link between entries"""
        return {
            "source_id": entry1_id,
            "target_id": entry2_id,
            "similarity_score": score,
            "timestamp": datetime.utcnow().isoformat()
        }

# Singleton instance
_cognee_config = None

def get_cognee_config() -> Optional[CogneeConfig]:
    """Get Cognee configuration instance"""
    global _cognee_config
    if _cognee_config is None and COGNEE_API_TOKEN:
        _cognee_config = CogneeConfig(COGNEE_API_TOKEN)
    return _cognee_config
