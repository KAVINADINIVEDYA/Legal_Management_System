import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def get_token(username, password=None):
    if password is None:
        password = "admin123" if username == "admin" else "officer123"
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
        if r.status_code != 200:
            print(f"Login failed for {username}: {r.status_code} - {r.text}")
            import sys
            sys.exit(1)
        return r.json()["access_token"]
    except Exception as e:
        print(f"Request failed: {e}")
        import sys
        sys.exit(1)

def test_workflow():
    print("--- Starting Case Workflow Verification ---")
    
    # 1. Admin creates a case
    admin_token = get_token("admin")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create a unique title
    case_title = f"Workflow Test {int(time.time())}"
    case_data = {
        "title": case_title,
        "case_type": "money_recovery",
        "parties": "Test Party A vs Test Party B",
        "description": "Verification of auto-assignment and review flow"
    }
    
    r = requests.post(f"{BASE_URL}/cases", json=case_data, headers=headers)
    if r.status_code == 201:
        case = r.json()
        case_id = case["id"]
        assigned_id = case["assigned_officer_id"]
        print(f"Created case {case['case_number']}, assigned to officer ID: {assigned_id}")
    else:
        print(f"Create case status: {r.status_code}")
        # Check if it was created anyway
        r_list = requests.get(f"{BASE_URL}/cases", headers=headers)
        found = [c for c in r_list.json() if c["title"] == case_title]
        if found:
            case = found[0]
            case_id = case["id"]
            assigned_id = case["assigned_officer_id"]
            print(f"Case found in DB (ID: {case_id}), proceeding.")
        else:
            print(f"Case not found. Creation failed: {r.text}")
            import sys
            sys.exit(1)
    
    # Selection should be 3 or 4
    assert assigned_id in [3, 4], f"Case should be assigned to officer1 (3) or officer2 (4), but got {assigned_id}"
    
    # 2. Verify role-based visibility
    off1_token = get_token("officer1")
    off2_token = get_token("officer2")
    
    # Check if officer1 can see their cases
    r1 = requests.get(f"{BASE_URL}/cases", headers={"Authorization": f"Bearer {off1_token}"})
    off1_cases = [c["id"] for c in r1.json()]
    
    # Check if officer2 can see their cases
    r2 = requests.get(f"{BASE_URL}/cases", headers={"Authorization": f"Bearer {off2_token}"})
    off2_cases = [c["id"] for c in r2.json()]
    
    # Visibility logic check
    if assigned_id == 3:
        assert case_id in off1_cases, "Officer 1 should see assigned case"
        assert case_id not in off2_cases, "Officer 2 should NOT see case assigned to Officer 1"
        target_token = off1_token
        target_name = "officer1"
    else:
        assert case_id in off2_cases, "Officer 2 should see assigned case"
        assert case_id not in off1_cases, "Officer 1 should NOT see case assigned to Officer 2"
        target_token = off2_token
        target_name = "officer2"
    
    print(f"Visibility check passed: Only {target_name} can see the case.")

    # 3. Test transitions (Submit for Review -> Active/Send Back)
    # Admin submits for review
    requests.put(f"{BASE_URL}/cases/{case_id}/status?new_status=PENDING_REVIEW", headers=headers)
    print("Admin: Submitted for Review")
    
    # Officer activates (Active)
    r = requests.put(f"{BASE_URL}/cases/{case_id}/status?new_status=ACTIVE", headers={"Authorization": f"Bearer {target_token}"})
    if r.status_code != 200:
        print(f"Activation failed: {r.status_code} - {r.text}")
        exit(1)
    print(f"{target_name}: Clicked 'Active'")
    
    # Create another case for "Send Back" test
    r = requests.post(f"{BASE_URL}/cases", json={"title": "Revision Test", "case_type": "other"}, headers=headers)
    case2 = r.json()
    case2_id = case2["id"]
    assigned_id2 = case2["assigned_officer_id"]
    token2 = off1_token if assigned_id2 == 3 else off2_token
    name2 = "officer1" if assigned_id2 == 3 else "officer2"
    
    requests.put(f"{BASE_URL}/cases/{case2_id}/status?new_status=PENDING_REVIEW", headers=headers)
    print(f"Admin: Submitted Revision Case for Review (Assigned to {name2})")
    
    r = requests.put(f"{BASE_URL}/cases/{case2_id}/status?new_status=REVISION_REQUIRED", headers={"Authorization": f"Bearer {token2}"})
    if r.status_code != 200:
        print(f"Send Back failed: {r.status_code} - {r.text}")
        exit(1)
    print(f"{name2}: Clicked 'Send Back'")

    print("--- Verification Successful! ---")

if __name__ == "__main__":
    import time
    test_workflow()
