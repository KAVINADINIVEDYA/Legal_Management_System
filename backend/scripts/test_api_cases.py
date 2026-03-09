import requests
import json

base_url = "http://localhost:8000/api"

def test_cases():
    try:
        # 1. Login
        print("Logging in...")
        login_res = requests.post(f"{base_url}/auth/login", json={"username": "admin", "password": "admin123"})
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code} - {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        print("Login successful. Token acquired.")

        # 2. Get Cases
        print("Fetching cases...")
        headers = {"Authorization": f"Bearer {token}"}
        cases_res = requests.get(f"{base_url}/cases", headers=headers)
        
        if cases_res.status_code != 200:
            print(f"Fetch cases failed: {cases_res.status_code} - {cases_res.text}")
            return
        
        cases = cases_res.json()
        print(f"Fetched {len(cases)} cases.")
        if cases:
            print(f"First case sample: {json.dumps(cases[0], indent=2)}")
        else:
            print("No cases returned from API.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_cases()
