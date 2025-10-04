import streamlit as st
import requests

st.set_page_config(page_title="Drug Interaction Checker", layout="centered")
st.title("💊 Drug Interaction Checker")

st.write("Enter two drug names to check for possible interactions.")

drug1 = st.text_input("Drug 1")
drug2 = st.text_input("Drug 2")

if st.button("Check Interaction"):
    if not drug1 or not drug2:
        st.warning("Please enter both drug names.")
    else:
        with st.spinner("Checking interaction..."):
            response = requests.post("http://127.0.0.1:8000/check", json={
                "drug1": drug1,
                "drug2": drug2
            })

            if response.status_code == 200:
                data = response.json()
                st.subheader("🔍 Interaction:")
                st.success(data["interaction"])

                st.subheader("🧠 AI Opinion:")
                st.info(data["ai_opinion"])
            else:
                st.error("Error: Could not get response.")
