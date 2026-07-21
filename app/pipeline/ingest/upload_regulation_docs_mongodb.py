import os 
from pathlib import Path
import gridfs
from core.database import get_mongo_connection
from dotenv import load_dotenv

load_dotenv()

def upload_docs():
    
    base_dir = Path(__file__).parent / "data" / "fia_regulations_data"
    
    if not base_dir.is_dir():
        raise ValueError("There is no regulation docs")

    files = list(base_dir.rglob("*.pdf"))
    
    client=get_mongo_connection()
    db_name=os.environ["MONGODB_DATABASE_NAME"]
    db = client[db_name]

    #init the gridFS bucket 
    bucket_name = "regulation"
    bucket = gridfs.GridFSBucket(db, bucket_name=bucket_name)
    files_col = db[f"{bucket_name}.files"]

    SECTION_TYPES = {
        "a" : "general_provisioning", 
        "b" : "sporting",
        "c" : "technical",
        "d": "financial_f1_teams",
        "e": "financial_pu_manufacturers",
        "f": "operational"
    }

    for file in files: 
        parts = file.stem.split("_")
        if len(parts) < 3 or not parts[1].isdigit():
            raise ValueError(f"Bad filename, expected fia_<season>_f1_<regulation_type>..")
        
        season=int(parts[1])
        regulation_type= SECTION_TYPES[parts[6]]
        file_name = f"{season}_{regulation_type}"
        
        if files_col.find_one({"filename": file_name}) is not None: 
            continue 

        with file.open("rb") as f:
            id = bucket.upload_from_stream(
                file_name,
                f, 
                metadata={
                    "contentType": "pdf",
                    "season": f"{season}",
                    "regulation_type": f"{regulation_type}",
                }
            )

upload_docs() 