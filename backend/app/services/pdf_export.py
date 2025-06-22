import io
from datetime import datetime
from typing import List
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from app.models import ChatMessage, ConversationConfig

def generate_conversation_pdf(
    conversation_id: str,
    config: ConversationConfig,
    messages: List[ChatMessage],
    status: str,
    created_at: datetime
) -> bytes:
    """Generate a formatted PDF of the conversation"""
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                          rightMargin=72, leftMargin=72, 
                          topMargin=72, bottomMargin=18)
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.HexColor('#374151')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        leftIndent=0
    )
    
    message_style = ParagraphStyle(
        'MessageStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=8,
        leftIndent=12,
        rightIndent=12
    )
    
    ai1_style = ParagraphStyle(
        'AI1Style',
        parent=message_style,
        textColor=colors.HexColor('#3b82f6')  # Blue
    )
    
    ai2_style = ParagraphStyle(
        'AI2Style', 
        parent=message_style,
        textColor=colors.HexColor('#10b981')  # Green
    )
    
    system_style = ParagraphStyle(
        'SystemStyle',
        parent=message_style,
        textColor=colors.HexColor('#6b7280')  # Gray
    )
    
    # Build PDF content
    story = []
    
    # Title
    story.append(Paragraph("Parley AI Conversation Report", title_style))
    story.append(Spacer(1, 20))
    
    # Metadata section
    story.append(Paragraph("Conversation Details", heading_style))
    
    metadata_data = [
        ['Conversation ID', conversation_id[:8] + '...'],
        ['Status', status.title()],
        ['Created', created_at.strftime('%Y-%m-%d %H:%M:%S UTC')],
        ['Message Count', str(len(messages))],
        ['Message Limit', str(config.message_limit)],
        ['Message Delay', f"{config.message_delay_ms}ms"],
        ['Max Tokens per Response', str(config.max_tokens_per_response)]
    ]
    
    metadata_table = Table(metadata_data, colWidths=[2*inch, 3*inch])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    story.append(metadata_table)
    story.append(Spacer(1, 20))
    
    # AI Configuration section
    story.append(Paragraph("AI Configuration", heading_style))
    
    ai_config_data = [
        ['', 'AI 1', 'AI 2'],
        ['Provider', config.ai1.provider.value.title(), config.ai2.provider.value.title()],
        ['Model', config.ai1.model, config.ai2.model],
        ['Persona', config.ai1.persona or 'None', config.ai2.persona or 'None']
    ]
    
    ai_config_table = Table(ai_config_data, colWidths=[1.5*inch, 2.25*inch, 2.25*inch])
    ai_config_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    story.append(ai_config_table)
    story.append(Spacer(1, 20))
    
    # Initial Prompt
    story.append(Paragraph("Initial Prompt", heading_style))
    story.append(Paragraph(config.initial_prompt, normal_style))
    story.append(Spacer(1, 20))
    
    # Start new page for conversation
    story.append(PageBreak())
    story.append(Paragraph("Conversation Messages", title_style))
    story.append(Spacer(1, 20))
    
    # Messages
    for i, message in enumerate(messages):
        # Message header with sender and timestamp
        sender_label = {
            'ai1': 'AI 1',
            'ai2': 'AI 2', 
            'system': 'System'
        }.get(message.sender, message.sender)
        
        timestamp = message.timestamp.strftime('%H:%M:%S')
        header_text = f"<b>{sender_label}</b> - {timestamp}"
        
        if message.sender == 'ai1':
            style = ai1_style
        elif message.sender == 'ai2':
            style = ai2_style
        else:
            style = system_style
            
        story.append(Paragraph(header_text, style))
        
        # Message content with word wrapping
        content = message.content.replace('\n', '<br/>')
        story.append(Paragraph(content, message_style))
        story.append(Spacer(1, 12))
        
        # Add page break every 10 messages to keep readable
        if (i + 1) % 10 == 0 and i < len(messages) - 1:
            story.append(PageBreak())
    
    # Footer
    story.append(Spacer(1, 20))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    story.append(Paragraph(f"Generated by Parley on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", footer_style))
    
    # Build PDF
    doc.build(story)
    
    buffer.seek(0)
    return buffer.getvalue()