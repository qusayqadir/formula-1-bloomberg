from langsmith import Client
from pydantic.json_schema import Examples 


DATASET_NAME = "f1-domain-router-node"

EXAMPLES = [
    {
        "inputs" :{
            "query" : "what is the min/max permitted weigth of an f1 car"
         },
        "outputs" :{
            "route" : "REGULATION"
        }
    }
]

def main():

    client = Client() 

    dataset = client.create_dataset(
        dataset_name = DATASET_NAME
    )

    client.create_example(
        dataset_id=dataset.id,
        examples=EXAMPLES,
    )

    print(
        f"created dataset : '{DATASET_NAME}'"
        f"with {len(EXAMPLES)} examples"
    )

if __name__ == "__main__": 
    main()


# python -m app.chatbot.evals.route_dataset
# langsmith should see Datasets & Experiments - f1-domain-router-v1