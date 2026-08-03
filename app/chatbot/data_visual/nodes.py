from typing import Literal 

from app.chatbot.state import AgentState
from app.chatbot.data_visual.prompts import (

)
from app.chatbot.core.models import (
    answer_model, 
    analysis_model
)
from langchain_core.messages import (
    HumanMessage, 
    SystemMessage
)

from app.chatbot.data_visual.schemas import (

)

from core.database import (
    get_connection
)

from langchain_core.tools import tool 
from langgraph.prebuilt import create_react_agents 



# fetch all tables from database? 
@tool
def list_sql_tables() -> str: 
    """Input is an empty string, output is a comma-separated list of tables in the database."""
    conn = get_connection()
    try: 
        cursor = conn.execute(
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema='bronze'
            ORDER by table_name
            """)
        tables = [
            row[0]
            for row in cursor.fetchall()
        ]
        return ", ".join(tables)
    finally:
        conn.close()

@tool 
def sql_table_schema(table_names: str) -> str: 






# decide which tables are needed? 

# generate SQL query for which would be the closest to the user query 

# double check the query for mistakes

# execute the query and return the results? 

# generate the code for the component using the same style as the rest of the 
#codebase 

#verify the image that was generated 
