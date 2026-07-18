from typing import Optional
from langchain_anthropic import ChatAnthropic
import os
from dotenv import load_dotenv

load_dotenv()

class ChatModel(): 
    def __init__(self, model: str, temp: Optional[float], max_token: Optional[int], timeout: Optional[float] = None, max_retries: Optional[int] = 2): 
       
        if not model or not max_token: 
            raise RuntimeError("No Model is set for Langgraph graph config")
        
        self.model = model 
        self.temp = temp
        self.max_token = max_token 
        self.timeout = timeout 
        self.max_retries=max_retries
    
        self.client = ChatAnthropic(
            model=self.model, 
            temperature=self.temp, 
            max_tokens=self.max_token,
            timeout=self.timeout,
            max_retries=self.max_retries
        )
    
    def invoke(self, prompt: str) -> dict:
        return self.client.invoke(prompt)


answer_model = ChatModel(model="claude-sonnet-5" , temp=0.4, max_token=3000, max_retries=3)
analysis_model = ChatModel(model="claude-haiku-4-5", temp=0.4, max_token=1000, max_retries=2)