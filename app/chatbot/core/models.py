from langchain_anthropic import ChatAnthropic
import os
from dotenv import load_dotenv

load_dotenv()

class ChatModel(): 
    def __init__(self, model: str, temp: int, max_token: int, timeout: str): 
        if not model or max_token: 
            raise RuntimeError("No Model is set for Langgraph graph config")
        
        self.model = model 
        self.temp = temp
        self.max_token = max_token 
        self.timeout = timeout 
    
        self.client = ChatAnthropic(
            model=self.model, 
            temperature=self.temp, 
            max_tokens=self.max_token,
            timeout=self.timeout

        )
    
    def invoke(self, prompt: str) -> dict:
        return self.client.invoke(prompt)


answer_model = ChatModel(model= , temp=, max_token=, temperatur=)
analysis_model = ChatModel(model=, token=, max_token= temperatur=)