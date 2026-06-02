from app.modules.facebook.src.core.config.database import supabase
def get_all_categoriesFB():
    response = supabase.table("categories").select("*").execute()
    # lọc ra từng loại category riêng biệt
    categories_data = response.data
    intents = []
    industries = []
    tiers = []
    teams = []
    icp = []
    for item in categories_data:
        if item["category_type"] == "intent":
            intents.append({"id": item["id"], "name": item["name"], "value": item["code"]})
        elif item["category_type"] == "industry":
            industries.append({"id": item["id"], "name": item["name"], "value": item["code"]})
        elif item["category_type"] == "tier":
            tiers.append({"id": item["id"], "name": item["name"], "value": item["code"]})
        elif item["category_type"] == "team":
            teams.append({"id": item["id"], "name": item["name"], "value": item["code"]})
        elif item["category_type"] == "icp":
            icp.append({"id": item["id"], "name": item["name"], "value": item["code"]})
    return {
        "intents": intents,
        "industries": industries,
        "tiers": tiers,
        "teams": teams,
        "icp": icp
    }


# cách sử dụng: gọi hàm get_all_categoriesFB() sẽ trả về một dict chứa 4 key: intents, industries, tiers, teams. Mỗi key sẽ có giá trị là một list các category tương ứng đã được phân loại sẵn. Ví dụ:
# {
#     "intents": [
#         {"id": "uuid1", "name": "Intent 1", "value": "intent_1"},
#         {"id": "uuid2", "name": "Intent 2", "value": "intent_2"},
#         ...
#     ],
#     "industries": [
#         {"id": "uuid3", "name": "Industry 1", "value": "industry_1"},
#         {"id": "uuid4", "name": "Industry 2", "value
#     ],
#     "tiers": [                

#     ],
#     "teams": [    
#     ]
# }

