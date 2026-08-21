# Formula-1 Bloomberg Terminal 

### AWS Architecture:

<img width="3080" height="1528" alt="AWS F1-Bloomberg Terminal Architecture" src="https://github.com/user-attachments/assets/583aba36-722f-47aa-bff2-c3a8e4f3b2b4" />

### Database Schema: 

<img width="1758" height="2612" alt="f1-database-schema" src="https://github.com/user-attachments/assets/b49abe68-4863-4ff0-8c34-5e316bc70303" />

### .env file 

```
# DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE"

#Database connection url![Uploading AWS.F1-Bloomberg.Terminal.Architecture.png…]()
![Uploading AWS.F1-Bloomberg.Terminal.Architecture.png…]()

DATABASE_URL=

#API Endpoints
#Backend API Endpoints
BASE_URL="https://api.jolpi.ca/ergast/f1"


#Langgraph Graph/Node Model API Key 
ANTHROPIC_API_KEY=""

#Langsmith Configuration 
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=""
LANGSMITH_PROJECT=""
ANTHROPIC_MODEL=

#MongoDB Config 
MONGODB_URI=""
MONGODB_DATABASE_NAME=""

#Embedding Model API Key
VOYAGE_API_KEY=""
```

