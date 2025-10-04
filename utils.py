import os
import re
import requests
import easyocr

# Initialize EasyOCR
reader = easyocr.Reader(['en'], gpu=False)


# ------------------------------
# 1. OCR: Extract text from image
# ------------------------------
def extract_text_from_image(image_path):
    try:
        results = reader.readtext(image_path, detail=0)
        raw_text = " ".join(results).strip()
        cleaned_text = re.sub(r'[^A-Za-z0-9\s\-]', '', raw_text)
        return cleaned_text
    except Exception as e:
        print("OCR error:", e)
        return ""


# ------------------------------
# 2. Extract drug-like names from OCR text
# ------------------------------
def get_drug_name_from_text(text):
    drug_like_pattern = r'\b([A-Z][A-Z0-9\-]{3,}|[A-Z][a-z]+(?:ine|ol|cin|vir|azole|xine|pril|sartan|mab|caine|fen|done))\b'
    matches = re.findall(drug_like_pattern, text, re.IGNORECASE)
    if matches:
        return " ".join(dict.fromkeys(matches))  # remove duplicates while preserving order
    return text.strip()


# ------------------------------
# 3. Get RxCUI from drug name using RxNorm
# ------------------------------
def get_rxcui_from_name(drug_name):
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={drug_name}"
    try:
        resp = requests.get(url)
        if resp.ok:
            data = resp.json()
            rxnorm_ids = data.get("idGroup", {}).get("rxnormId", [])
            if rxnorm_ids:
                return rxnorm_ids[0]
    except Exception as e:
        print("Error getting RxCUI:", e)
    return None


# ------------------------------
# 4. Get drug info from OpenFDA using RxCUI
# ------------------------------
def get_drug_info_from_openfda(rxcui):
    url = f"https://api.fda.gov/drug/label.json?search=openfda.rxcui:{rxcui}"
    try:
        resp = requests.get(url)
        if resp.ok:
            results = resp.json().get("results", [])
            if results:
                return results[0]
    except Exception as e:
        print("OpenFDA error:", e)
    return {}


# ------------------------------
# 5. Suggest corrected drug names using Approximate Term API
# ------------------------------
def suggest_correct_drug_name(input_name):
    url = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json"
    params = {
        "term": input_name,
        "maxEntries": 5
    }
    try:
        resp = requests.get(url, params=params)
        if resp.ok:
            data = resp.json()
            candidates = data.get("approximateGroup", {}).get("candidate", [])
            suggestions = []
            for c in candidates:
                rxcui = c.get("rxcui")
                if rxcui:
                    name = get_name_from_rxcui(rxcui)
                    if name and name not in suggestions:
                        suggestions.append(name)
            return suggestions
    except Exception as e:
        print("Suggestion API error:", e)
    return []


# ------------------------------
# 6. Helper: Get drug name from RxCUI
# ------------------------------
def get_name_from_rxcui(rxcui):
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json"
    try:
        resp = requests.get(url)
        if resp.ok:
            data = resp.json()
            return data.get("properties", {}).get("name")
    except Exception as e:
        print("Name lookup error:", e)
    return None


# ------------------------------
# 7. Final Function: Get full drug info from image
# ------------------------------
def process_drug_image(image_path):
    extracted_text = extract_text_from_image(image_path)
    drug_name_guess = get_drug_name_from_text(extracted_text)
    rxcui = get_rxcui_from_name(drug_name_guess)

    if rxcui:
        drug_info = get_drug_info_from_openfda(rxcui)
        return {
            "raw_text": extracted_text,
            "detected_name": drug_name_guess,
            "suggestions": [],
            "rxcui": rxcui,
            "fda_info": drug_info
        }
    else:
        suggestions = suggest_correct_drug_name(drug_name_guess)
        return {
            "raw_text": extracted_text,
            "detected_name": drug_name_guess,
            "suggestions": suggestions,
            "rxcui": None,
            "fda_info": {}
        }
    