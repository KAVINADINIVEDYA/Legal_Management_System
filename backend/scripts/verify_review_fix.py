import requests
import json

base_url = "http://localhost:8000/api"

def run_verification():
    try:
        # 1. Login as Admin
        print("Logging in as admin...")
        admin_res = requests.post(f"{base_url}/auth/login", json={"username": "admin", "password": "admin123"})
        admin_token = admin_res.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # 2. Get Users to find Reviewer and Manager
        print("Finding reviewer and manager...")
        # Note: We don't have a direct /users endpoint shown in README, but we can assume roles from DB seeding
        # Let's assume reviewer1/review123 is a reviewer and reviewer2/review123 is a manager (based on previous PRAGMA output)
        # Previous output: [(1, 'admin', 'admin'), (2, 'supervisor', 'supervisor'), (3, 'officer1', 'legal_officer'), (4, 'officer2', 'legal_officer'), (5, 'reviewer1', 'reviewer'), (6, 'manager', 'manager')]
        
        reviewer_id = 5
        manager_username = "manager"
        manager_password = "manager123"

        # 3. Create Agreement with immediate submission
        print("Creating agreement with immediate review submission...")
        agreement_data = {
            "title": "Test Service Agreement",
            "agreement_type": "service_level",
            "parties": "[\"Mobitel\", \"Test Corp\"]",
            "value": 50000.0,
            "currency": "LKR",
            "description": "Verification of review workflow",
            "reviewer_ids": [reviewer_id]
        }
        create_res = requests.post(f"{base_url}/agreements", json=agreement_data, headers=headers_admin)
        if create_res.status_code != 201:
            print(f"Failed to create agreement: {create_res.status_code} - {create_res.text}")
            return
        
        agreement = create_res.json()
        agreement_id = agreement["id"]
        print(f"Agreement created and submitted. Status: {agreement['status']}")

        if agreement['status'] != "UNDER_REVIEW":
             print(f"Error: Agreement status should be UNDER_REVIEW, got {agreement['status']}")
             return

        # 4. Login as Reviewer and Approve
        print("Logging in as reviewer...")
        rev_res = requests.post(f"{base_url}/auth/login", json={"username": "reviewer1", "password": "review123"})
        rev_token = rev_res.json()["access_token"]
        headers_rev = {"Authorization": f"Bearer {rev_token}"}
        
        print("Approving agreement step...")
        approve_res = requests.post(f"{base_url}/agreements/{agreement_id}/approve", json={"comments": "Looks good!"}, headers=headers_rev)
        print(f"Approve result: {approve_res.status_code} - {approve_res.text}")

        # 5. Login as Manager and check notifications
        print("Logging in as manager...")
        mgr_res = requests.post(f"{base_url}/auth/login", json={"username": manager_username, "password": manager_password})
        if mgr_res.status_code != 200:
             print(f"Manager login failed: {mgr_res.status_code}. Checking if password is correct.")
             # Try manager / manager123 based on seeds
             mgr_res = requests.post(f"{base_url}/auth/login", json={"username": "manager", "password": "manager123"})
             if mgr_res.status_code != 200:
                  print("Manager login still failed. Ending test.")
                  return

        mgr_token = mgr_res.json()["access_token"]
        headers_mgr = {"Authorization": f"Bearer {mgr_token}"}
        
        print("Checking manager notifications...")
        notif_res = requests.get(f"{base_url}/notifications", headers=headers_mgr)
        notifications = notif_res.json()
        print(f"Found {len(notifications)} notifications for manager.")
        
        # Check if any notification relates to our agreement
        found = False
        for n in notifications:
            if n["entity_type"] == "agreement" and n["entity_id"] == agreement_id:
                print(f"√ Found notification: {n['message']}")
                found = True
                break
        
        if not found:
            print("X No notification found for the manager about the agreement review.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_verification()
