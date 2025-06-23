import io
from datetime import datetime
from typing import List
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from app.models import ConversationConfig
from app.models.analytics import ConversationAnalytics, SentimentPoint, WordFrequency, TopicSegment

def generate_analytics_pdf(
    conversation_id: str,
    analytics: ConversationAnalytics,
    config: ConversationConfig,
    created_at: datetime
) -> bytes:
    """Generate a comprehensive analytics PDF report"""
    
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
        fontSize=22,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.HexColor('#374151')
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=10,
        spaceBefore=15,
        textColor=colors.HexColor('#4B5563')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        leftIndent=0
    )
    
    # Build PDF content
    story = []
    
    # Title
    story.append(Paragraph("Parley Analytics Report", title_style))
    story.append(Spacer(1, 20))
    
    # Executive Summary
    story.append(Paragraph("Executive Summary", heading_style))
    
    # Calculate some summary insights
    total_messages = sum(analytics.message_counts.values())
    avg_sentiment_ai1 = sum(sp.sentiment_polarity for sp in analytics.sentiment_over_time if sp.speaker == 'ai1') / max(1, len([sp for sp in analytics.sentiment_over_time if sp.speaker == 'ai1']))
    avg_sentiment_ai2 = sum(sp.sentiment_polarity for sp in analytics.sentiment_over_time if sp.speaker == 'ai2') / max(1, len([sp for sp in analytics.sentiment_over_time if sp.speaker == 'ai2']))
    
    # Determine conversation tone
    overall_sentiment = (avg_sentiment_ai1 + avg_sentiment_ai2) / 2
    tone_description = "neutral"
    if overall_sentiment > 0.2:
        tone_description = "positive"
    elif overall_sentiment < -0.2:
        tone_description = "negative"
    
    # Determine topic stability
    avg_topic_shift = sum(seg.topic_shift_score for seg in analytics.topic_drift) / max(1, len(analytics.topic_drift))
    topic_stability = "highly focused" if avg_topic_shift < 0.3 else "moderately focused" if avg_topic_shift < 0.6 else "highly dynamic"
    
    summary_text = f"""
    This conversation involved {total_messages} messages between two AI participants. The overall tone was <b>{tone_description}</b> 
    (sentiment: {overall_sentiment:.2f}), and the conversation was <b>{topic_stability}</b> with an average topic shift score of {avg_topic_shift:.2f}.
    
    The conversation demonstrated a readability level of {analytics.readability_score:.1f} (Flesch-Kincaid grade), 
    indicating {'accessible' if analytics.readability_score < 10 else 'moderate' if analytics.readability_score < 15 else 'advanced'} 
    language complexity. Vocabulary richness was {analytics.vocabulary_richness*100:.1f}%, showing 
    {'diverse' if analytics.vocabulary_richness > 0.6 else 'moderate' if analytics.vocabulary_richness > 0.4 else 'repetitive'} 
    language use.
    """
    
    story.append(Paragraph(summary_text, normal_style))
    story.append(Spacer(1, 20))
    
    # Conversation Metadata
    story.append(Paragraph("Conversation Details", heading_style))
    
    metadata_data = [
        ['Conversation ID', conversation_id[:8] + '...'],
        ['Analysis Date', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')],
        ['Created', created_at.strftime('%Y-%m-%d %H:%M:%S UTC')],
        ['Total Messages', str(total_messages)],
        ['Message Limit', str(config.message_limit)],
        ['Avg Response Time', f"{analytics.avg_response_time_seconds:.1f} seconds"],
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
    
    # Key Metrics Summary
    story.append(Paragraph("Key Metrics", heading_style))
    
    # Format question ratios
    question_ratio_text = ', '.join([f"{speaker.upper()}: {ratio*100:.1f}%" for speaker, ratio in analytics.question_ratio.items()])
    
    metrics_data = [
        ['Readability Score', f"{analytics.readability_score:.1f} (Flesch-Kincaid Grade Level)"],
        ['Vocabulary Richness', f"{analytics.vocabulary_richness*100:.1f}% (Type-Token Ratio)"],
        ['Question Ratio', question_ratio_text],
        ['Topic Segments', str(len(analytics.topic_drift))],
        ['Average Topic Shift', f"{avg_topic_shift:.1f}% per segment"],
    ]
    
    metrics_table = Table(metrics_data, colWidths=[2*inch, 3*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    story.append(metrics_table)
    story.append(Spacer(1, 20))
    
    # Message Distribution
    story.append(Paragraph("Message Distribution", heading_style))
    
    message_dist_data = [['Speaker', 'Messages', 'Percentage']]
    for speaker, count in analytics.message_counts.items():
        percentage = (count / total_messages * 100) if total_messages > 0 else 0
        message_dist_data.append([speaker.upper(), str(count), f"{percentage:.1f}%"])
    
    message_table = Table(message_dist_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
    message_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    story.append(message_table)
    story.append(Spacer(1, 20))
    
    # Start new page for detailed analysis
    story.append(PageBreak())
    story.append(Paragraph("Detailed Analysis", title_style))
    story.append(Spacer(1, 20))
    
    # Sentiment Analysis
    story.append(Paragraph("Sentiment Analysis", heading_style))
    
    if analytics.sentiment_over_time:
        story.append(Paragraph("Sentiment Over Time", subheading_style))
        
        # Calculate sentiment ranges
        ai1_sentiments = [sp.sentiment_polarity for sp in analytics.sentiment_over_time if sp.speaker == 'ai1']
        ai2_sentiments = [sp.sentiment_polarity for sp in analytics.sentiment_over_time if sp.speaker == 'ai2']
        
        sentiment_summary = f"""
        <b>AI1 Sentiment:</b> Average {avg_sentiment_ai1:.2f}, Range {min(ai1_sentiments, default=0):.2f} to {max(ai1_sentiments, default=0):.2f}<br/>
        <b>AI2 Sentiment:</b> Average {avg_sentiment_ai2:.2f}, Range {min(ai2_sentiments, default=0):.2f} to {max(ai2_sentiments, default=0):.2f}<br/>
        <br/>
        Sentiment values range from -1 (very negative) to +1 (very positive), with 0 being neutral.
        """
        
        story.append(Paragraph(sentiment_summary, normal_style))
        story.append(Spacer(1, 15))
        
        # Sentiment data table (sample of key points)
        sentiment_data = [['Message #', 'Speaker', 'Sentiment', 'Subjectivity']]
        for i, sp in enumerate(analytics.sentiment_over_time[:10]):  # Show first 10
            sentiment_data.append([
                str(sp.message_index + 1),
                sp.speaker.upper(),
                f"{sp.sentiment_polarity:.2f}",
                f"{sp.sentiment_subjectivity:.2f}"
            ])
        
        if len(analytics.sentiment_over_time) > 10:
            sentiment_data.append(['...', '...', '...', '...'])
        
        sentiment_table = Table(sentiment_data, colWidths=[1*inch, 1*inch, 1*inch, 1*inch])
        sentiment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(sentiment_table)
    
    story.append(Spacer(1, 20))
    
    # Topic Analysis
    story.append(Paragraph("Topic Analysis", heading_style))
    
    # Top Keywords
    story.append(Paragraph("Most Frequent Keywords", subheading_style))
    
    if analytics.topic_keywords:
        keywords_text = ", ".join([f"{kw.text} ({kw.value})" for kw in analytics.topic_keywords[:15]])
        story.append(Paragraph(f"<b>Top Keywords:</b> {keywords_text}", normal_style))
        story.append(Spacer(1, 15))
        
        # Keywords table
        keywords_data = [['Keyword', 'Frequency']]
        for kw in analytics.topic_keywords[:20]:
            keywords_data.append([kw.text, str(kw.value)])
        
        keywords_table = Table(keywords_data, colWidths=[2*inch, 1*inch])
        keywords_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(keywords_table)
    
    story.append(Spacer(1, 20))
    
    # Topic Drift Analysis
    if analytics.topic_drift:
        story.append(Paragraph("Topic Evolution Analysis", heading_style))
        
        topic_drift_text = f"""
        The conversation was divided into {len(analytics.topic_drift)} segments to analyze how topics evolved. 
        Topic shift scores indicate how much the discussion changed between segments, with higher scores indicating greater topic drift.
        """
        
        story.append(Paragraph(topic_drift_text, normal_style))
        story.append(Spacer(1, 10))
        
        # Topic drift table
        drift_data = [['Segment', 'Messages', 'Topic Shift %', 'Key Topics']]
        for segment in analytics.topic_drift:
            topics_text = ', '.join([t.text for t in segment.dominant_topics[:3]])
            drift_data.append([
                f"Segment {segment.segment_index + 1}",
                f"{segment.start_message + 1}-{segment.end_message + 1}",
                f"{segment.topic_shift_score * 100:.1f}%",
                topics_text
            ])
        
        drift_table = Table(drift_data, colWidths=[1*inch, 1*inch, 1*inch, 2.5*inch])
        drift_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (2, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(drift_table)
    
    # Footer
    story.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    story.append(Paragraph(f"Generated by Parley Analytics on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", footer_style))
    
    # Build PDF
    doc.build(story)
    
    buffer.seek(0)
    return buffer.getvalue()