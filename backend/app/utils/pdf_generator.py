
from fpdf import FPDF
import os
from datetime import datetime
from app.config import settings

class CaseSummaryPDF(FPDF):
    def header(self):
        # Logo or Title
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'MobiLex - Legal Management System', 0, 1, 'C')
        self.set_font('Helvetica', 'I', 10)
        self.cell(0, 10, 'Generated Case Summary', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_case_summary_pdf(data: dict) -> str:
    """
    Generates a PDF summary for a manually entered case.
    Returns the absolute path to the generated file.
    """
    pdf = CaseSummaryPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', '', 12)

    # General Information
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 10, 'General Information', 0, 1)
    pdf.set_font('Helvetica', '', 12)
    
    fields = [
        ('Case Title', data.get('title')),
        ('Case Type', data.get('case_type', '').replace('_', ' ').title()),
        ('Parties Involved', data.get('parties')),
        ('Nature of Case', data.get('nature_of_case')),
        ('Court / Authority', data.get('court_authority')),
        ('Financial Exposure', f"{data.get('currency', 'LKR')} {data.get('financial_exposure', 0):,.2f}"),
        ('Date of Filing', data.get('filed_date')),
    ]

    for label, value in fields:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(50, 8, f'{label}:', 0)
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(0, 8, str(value) if value else 'N/A', 0, 1)

    pdf.ln(5)

    # Case Specific Details
    details = data.get('case_details', {})
    if details:
        pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 10, 'Case Specific Details', 0, 1)
        pdf.set_font('Helvetica', '', 12)
        
        for key, val in details.items():
            label = key.replace('_', ' ').title()
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(50, 8, f'{label}:', 0)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(0, 8, str(val) if val else 'N/A', 0, 1)
        
        pdf.ln(5)

    # Summary of Facts
    if data.get('description'):
        pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 10, 'Summary of Facts', 0, 1)
        pdf.set_font('Helvetica', '', 10)
        pdf.multi_cell(0, 6, data.get('description'))

    # Save the file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"case_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    pdf.output(file_path)
    
    return file_path, filename
