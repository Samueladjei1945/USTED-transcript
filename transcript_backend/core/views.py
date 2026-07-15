import json, uuid, csv, requests as http_requests
from decimal import Decimal
from datetime import timedelta, date
from django.utils import timezone
from django.db import models
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from .models import Student, Admin, TranscriptRequest, ServicePrice, PasswordResetCode, SupportTicket
from .serializers import StudentSerializer, TranscriptRequestSerializer, StudentListSerializer, SupportTicketSerializer


def is_admin(user):
    return Admin.objects.filter(user=user).exists()


# Auth check - returns role of logged in user
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role(request):
    if is_admin(request.user):
        return Response({'role': 'admin', 'name': request.user.username})
    try:
        student = Student.objects.get(user=request.user)
        return Response({'role': 'student', 'name': student.name})
    except Student.DoesNotExist:
        return Response({'role': 'unknown'})


# Student views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_profile(request):
    try:
        student = Student.objects.get(user=request.user)
        serializer = StudentSerializer(student)
        return Response(serializer.data)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_requests(request):
    try:
        student = Student.objects.get(user=request.user)
        requests = TranscriptRequest.objects.filter(student=student).order_by('-created_at')
        serializer = TranscriptRequestSerializer(requests, many=True, context={'request': request})
        return Response(serializer.data)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_request(request):
    try:
        student = Student.objects.get(user=request.user)
        purpose = (request.data.get('purpose') or '').strip()
        if not purpose:
            return Response({'error': 'Purpose is required.'}, status=400)
        try:
            total_amount = Decimal(request.data.get('total_amount', 0) or 0)
        except Exception:
            return Response({'error': 'Invalid total amount.'}, status=400)
        req = TranscriptRequest.objects.create(
            student=student,
            purpose=purpose,
            notes=(request.data.get('notes') or '').strip(),
            transcript_type=(request.data.get('transcript_type') or '').strip(),
            momo_name=(request.data.get('momo_name') or '').strip(),
            momo_number=(request.data.get('momo_number') or '').strip(),
            momo_provider=(request.data.get('momo_provider') or '').strip(),
            telephone=(request.data.get('telephone') or '').strip(),
            address=(request.data.get('address') or '').strip(),
            total_amount=total_amount,
            status='Pending'
        )
        serializer = TranscriptRequestSerializer(req, context={'request': request})
        
        # Send confirmation email
        subject = 'Transcript Request Received'
        message = f"Dear {student.name},\n\nWe have received your request for: {req.purpose}.\nAmount due: GH₵{req.total_amount}.\nPlease ensure payment is completed.\n\nThank you,\nAAMUSTED Academic Affairs"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [student.email], fail_silently=True)
        
        return Response(serializer.data, status=201)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


# Admin views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_requests(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    qs = TranscriptRequest.objects.all().select_related('student').order_by('-created_at')

    # Search
    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            models.Q(student__name__icontains=search) |
            models.Q(student__student_id__icontains=search) |
            models.Q(purpose__icontains=search) |
            models.Q(transcript_type__icontains=search)
        )

    # Status filter
    status_filter = request.GET.get('status', '')
    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)

    # Date range
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    # Pagination
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 25))
    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    qs_page = qs[start:end]
    serializer = TranscriptRequestSerializer(qs_page, many=True, context={'request': request})
    return Response({
        'results': serializer.data,
        'total': total,
        'page': page,
        'page_size': page_size,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    qs = Student.objects.all().order_by('name')

    # Search
    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            models.Q(name__icontains=search) |
            models.Q(student_id__icontains=search) |
            models.Q(email__icontains=search)
        )

    # Pagination
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 25))
    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    qs_page = qs[start:end]
    serializer = StudentListSerializer(qs_page, many=True)
    return Response({
        'results': serializer.data,
        'total': total,
        'page': page,
        'page_size': page_size,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_detail(request, student_id):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    try:
        student = Student.objects.get(id=student_id)
        profile_serializer = StudentSerializer(student)
        requests_qs = TranscriptRequest.objects.filter(student=student).order_by('-created_at')
        req_serializer = TranscriptRequestSerializer(requests_qs, many=True, context={'request': request})
        return Response({
            'profile': profile_serializer.data,
            'requests': req_serializer.data,
        })
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_analytics(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    all_requests = TranscriptRequest.objects.all()
    today = timezone.now().date()

    # Weekly trend: requests per day for last 7 days
    weekly = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = all_requests.filter(created_at__date=d).count()
        weekly.append({"date": d.isoformat(), "count": count})

    # Monthly trend: requests per month for last 6 months
    monthly = []
    for i in range(5, -1, -1):
        first = (today.replace(day=1) - timedelta(days=1)) if i == 0 else (today.replace(day=1) - timedelta(days=30 * i))
        m_start = first.replace(day=1)
        if i > 0:
            m_start = (today.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        count = all_requests.filter(created_at__date__gte=m_start, created_at__date__lte=m_end).count()
        monthly.append({"month": m_start.strftime("%b %Y"), "count": count})
    # simpler approach: last 6 calendar months
    monthly = []
    for i in range(5, -1, -1):
        m = today.replace(day=1) - timedelta(days=1)
        for _ in range(5 - i):
            m = m.replace(day=1) - timedelta(days=1)
        m_start = m.replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        if m_start > today:
            continue
        count = all_requests.filter(created_at__date__gte=m_start, created_at__date__lte=m_end).count()
        monthly.insert(0, {"month": m_start.strftime("%b %Y"), "count": count})

    return Response({
        'total_requests': all_requests.count(),
        'pending_payment': all_requests.filter(status='Pending Payment').count(),
        'pending': all_requests.filter(status='Pending').count(),
        'approved': all_requests.filter(status='Approved').count(),
        'rejected': all_requests.filter(status='Rejected').count(),
        'total_students': Student.objects.count(),
        'requests_today': all_requests.filter(created_at__date=today).count(),
        'recent_requests': TranscriptRequestSerializer(
            all_requests.order_by('-created_at')[:5], many=True, context={'request': request}
        ).data,
        'weekly_trend': weekly,
        'monthly_trend': monthly,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_requests_csv(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="transcript_requests.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Student Name', 'Student ID', 'Transcript Type', 'Purpose', 'Amount', 'Telephone', 'Address', 'Status', 'Payment Ref', 'Created At'])
    for r in TranscriptRequest.objects.all().select_related('student').order_by('-created_at'):
        writer.writerow([r.id, r.student.name, r.student.student_id, r.transcript_type, r.purpose, r.total_amount, r.telephone, r.address, r.status, r.payment_reference, r.created_at])
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_students_csv(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="students.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Student ID', 'Name', 'Email', 'Year', 'GPA', 'Status', 'Created At'])
    for s in Student.objects.all().order_by('student_id'):
        writer.writerow([s.id, s.student_id, s.name, s.email, s.year, s.gpa, s.status, s.created_at])
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request, req_id):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    try:
        req = TranscriptRequest.objects.get(id=req_id)
    except TranscriptRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)

    if req.status != 'Approved':
        return Response({'error': 'Can only upload documents for approved requests.'}, status=400)

    file = request.FILES.get('document')
    if not file:
        return Response({'error': 'No file provided.'}, status=400)

    if not file.name.lower().endswith('.pdf'):
        return Response({'error': 'Only PDF files are allowed.'}, status=400)

    if file.size > 10 * 1024 * 1024:
        return Response({'error': 'File size must be under 10MB.'}, status=400)

    req.document = file
    req.save()
    serializer = TranscriptRequestSerializer(req, context={'request': request})
    return Response(serializer.data)


# ── Student Ticket Views ──

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def student_tickets(request):
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

    if request.method == 'GET':
        tickets = SupportTicket.objects.filter(student=student).order_by('-created_at')
        serializer = SupportTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    # POST — create ticket
    subject = (request.data.get('subject') or '').strip()
    message = (request.data.get('message') or '').strip()
    if not subject or not message:
        return Response({'error': 'Subject and message are required.'}, status=400)
    ticket = SupportTicket.objects.create(
        student=student,
        subject=subject,
        message=message,
    )
    serializer = SupportTicketSerializer(ticket)
    return Response(serializer.data, status=201)


# ── Admin Ticket Views ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_tickets(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    qs = SupportTicket.objects.all().select_related('student').order_by('-created_at')

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            models.Q(subject__icontains=search) |
            models.Q(student__name__icontains=search) |
            models.Q(student__student_id__icontains=search)
        )

    status_filter = request.GET.get('status', '')
    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)

    viewed_filter = request.GET.get('admin_viewed', '')
    if viewed_filter in ('true', 'false'):
        qs = qs.filter(admin_viewed=(viewed_filter == 'true'))

    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 25))
    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    serializer = SupportTicketSerializer(qs[start:end], many=True)
    return Response({
        'results': serializer.data,
        'total': total,
        'page': page,
        'page_size': page_size,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_respond_ticket(request, ticket_id):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=404)

    status_val = request.data.get('status', '').strip()
    response_text = (request.data.get('admin_response') or '').strip()

    if status_val and status_val not in [c[0] for c in SupportTicket.STATUS_CHOICES]:
        return Response({'error': 'Invalid status.'}, status=400)
    if status_val:
        ticket.status = status_val
    if response_text:
        ticket.admin_response = response_text
        ticket.responded_at = timezone.now()
        ticket.responded_by = request.user.username
    ticket.save()
    serializer = SupportTicketSerializer(ticket)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def student_mark_tickets_read(request):
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    SupportTicket.objects.filter(student=student, admin_response__gt='', student_read=False).update(student_read=True)
    return Response({'ok': True})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_mark_ticket_viewed(request, ticket_id):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    SupportTicket.objects.filter(id=ticket_id).update(admin_viewed=True)
    return Response({'ok': True})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_request_status(request, req_id):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    try:
        req = TranscriptRequest.objects.get(id=req_id)
        new_status = request.data.get('status')
        valid_statuses = [c[0] for c in TranscriptRequest.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, status=400)
        req.status = new_status
        req.reviewed_at = timezone.now()
        req.reviewed_by = request.user.username
        req.save()
        serializer = TranscriptRequestSerializer(req, context={'request': request})
        
        # Send status update email
        subject = f"Transcript Request {req.status}"
        message = f"Dear {req.student.name},\n\nYour request for '{req.purpose}' has been {req.status} by {req.reviewed_by}.\n\nThank you,\nAAMUSTED Academic Affairs"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [req.student.email], fail_silently=True)
        
        return Response(serializer.data)
    except TranscriptRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_request_status(request):
    if not is_admin(request.user):
        return Response({'error': 'Unauthorized'}, status=403)
    ids = request.data.get('ids', [])
    new_status = request.data.get('status', '').strip()
    valid_statuses = [c[0] for c in TranscriptRequest.STATUS_CHOICES]
    if not ids or not new_status:
        return Response({'error': 'ids and status are required.'}, status=400)
    if new_status not in valid_statuses:
        return Response({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, status=400)
    updated = TranscriptRequest.objects.filter(id__in=ids).update(
        status=new_status,
        reviewed_at=timezone.now(),
        reviewed_by=request.user.username,
    )
    # Send individual emails
    for req in TranscriptRequest.objects.filter(id__in=ids).select_related('student'):
        subject = f"Transcript Request {req.status}"
        message = f"Dear {req.student.name},\n\nYour request for '{req.purpose}' has been {req.status} by {req.reviewed_by}.\n\nThank you,\nAAMUSTED Academic Affairs"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [req.student.email], fail_silently=True)
    return Response({'updated': updated})


@api_view(['POST'])
def register_student(request):

    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '').strip()

    if not all([first_name, last_name, email, password]):
        return Response({'error': 'First name, last name, email, and password are required.'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered.'}, status=400)

    # Combine into name for legacy compat
    name = f"{first_name} {last_name}"

    user = User.objects.create(
        username=email,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=make_password(password)
    )
    Student.objects.create(
        user=user,
        student_id=None,
        name=name,
        email=email,
        year=None,
        gpa=0.00,
        status='Active'
    )
    
    # Send welcome email
    subject = 'Welcome to USTED Transcript Portal'
    message = f"Dear {name},\n\nYour account has been successfully created.\n\nYou can now log in to complete your profile and request academic records.\n\nThank you,\nAAMUSTED Academic Affairs"
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)
    
    return Response({'message': 'Registration successful. You can now log in.'}, status=201)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_student_profile(request):
    try:
        student = Student.objects.get(user=request.user)
        
        if 'student_id' in request.data:
            student_id = request.data.get('student_id')
            if student_id and Student.objects.filter(student_id=student_id).exclude(id=student.id).exists():
                return Response({'error': 'Student ID / Index Number already assigned to another user.'}, status=400)
            student.student_id = student_id or None
            
        if 'year' in request.data:
            student.year = request.data.get('year') or None
            
        student.save()
        serializer = StudentSerializer(student)
        return Response(serializer.data)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_payment(request):
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

    amount = request.data.get('amount')
    if not amount:
        return Response({'error': 'Amount is required'}, status=400)
    try:
        amount_k = int(float(amount) * 100)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid amount'}, status=400)

    reference = f"UST-{uuid.uuid4().hex[:12].upper()}"
    headers = {
        'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {
        'email': student.email,
        'amount': amount_k,
        'reference': reference,
    }
    try:
        resp = http_requests.post('https://api.paystack.co/transaction/initialize', json=payload, headers=headers)
        data = resp.json()
    except Exception as e:
        return Response({'error': f'Payment initialization failed: {str(e)}'}, status=500)

    if not data.get('status'):
        return Response({'error': data.get('message', 'Paystack error')}, status=400)

    return Response({
        'reference': reference,
        'access_code': data['data']['access_code'],
        'authorization_url': data['data']['authorization_url'],
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_and_create_request(request):
    reference = (request.data.get('reference') or '').strip()
    if not reference:
        return Response({'error': 'Payment reference is required'}, status=400)

    # Simulation mode: accept SIM- references without Paystack verification
    if not reference.startswith('SIM-'):
        headers = {'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'}
        try:
            resp = http_requests.get(f'https://api.paystack.co/transaction/verify/{reference}', headers=headers)
            data = resp.json()
        except Exception as e:
            return Response({'error': f'Payment verification failed: {str(e)}'}, status=500)

        if not data.get('status') or data['data']['status'] != 'success':
            return Response({'error': 'Payment not successful'}, status=400)

    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

    purpose = (request.data.get('purpose') or '').strip()
    if not purpose:
        return Response({'error': 'Purpose is required.'}, status=400)
    try:
        total_amount = Decimal(request.data.get('total_amount', 0) or 0)
    except Exception:
        return Response({'error': 'Invalid total amount.'}, status=400)

    req = TranscriptRequest.objects.create(
        student=student,
        purpose=purpose,
        notes=(request.data.get('notes') or '').strip(),
        transcript_type=(request.data.get('transcript_type') or '').strip(),
        momo_name=(request.data.get('momo_name') or '').strip(),
        momo_number=(request.data.get('momo_number') or '').strip(),
        momo_provider=(request.data.get('momo_provider') or '').strip(),
        telephone=(request.data.get('telephone') or '').strip(),
        address=(request.data.get('address') or '').strip(),
        total_amount=total_amount,
        payment_reference=reference,
        status='Pending'
    )
    serializer = TranscriptRequestSerializer(req, context={'request': request})

    subject = 'Transcript Request Received'
    message = f"Dear {student.name},\n\nWe have received your request for: {req.purpose}.\nPayment received: GH₵{req.total_amount}.\n\nThank you,\nAAMUSTED Academic Affairs"
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [student.email], fail_silently=True)

    return Response(serializer.data, status=201)

@api_view(['GET'])
def get_service_prices(request):
    prices = ServicePrice.objects.filter(is_active=True)
    data = [{'id': p.id, 'category': p.category, 'label': p.label, 'price': str(p.price)} for p in prices]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lookup_cgpa(request, student_id):
    try:
        student = Student.objects.get(user=request.user)
        if student.student_id != student_id:
            return Response({'error': 'You can only look up your own index number.'}, status=403)
        return Response({
            'student_id': student.student_id,
            'name': student.name,
            'gpa': str(student.gpa),
            'year': student.year,
            'status': student.status,
        })
    except Student.DoesNotExist:
        return Response({'error': 'No student record linked to your account.'}, status=404)


@api_view(['POST'])
def password_reset(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=400)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'If an account with that email exists, a reset link has been sent.'}, status=200)

    # Delete any existing codes for this user
    PasswordResetCode.objects.filter(user=user).delete()
    code = PasswordResetCode.objects.create(user=user)

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{code.token}/"
    subject = 'Password Reset — USTED Transcript Portal'
    message = f"Dear {user.first_name},\n\nClick the link below to reset your password:\n{reset_link}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nThank you,\nAAMUSTED Academic Affairs"
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)

    return Response({'message': 'If an account with that email exists, a reset link has been sent.'}, status=200)


@api_view(['POST'])
def password_reset_confirm(request):
    token_str = (request.data.get('token') or '').strip()
    password = request.data.get('password', '').strip()
    confirm = request.data.get('confirm_password', '').strip()

    if not token_str:
        return Response({'error': 'Token is required.'}, status=400)
    if not password or len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=400)
    if password != confirm:
        return Response({'error': 'Passwords do not match.'}, status=400)

    try:
        code = PasswordResetCode.objects.get(token=token_str)
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'Invalid or expired reset link.'}, status=400)

    if code.is_expired():
        code.delete()
        return Response({'error': 'Reset link has expired. Please request a new one.'}, status=400)

    user = code.user
    user.password = make_password(password)
    user.save()
    code.delete()

    return Response({'message': 'Password reset successful. You can now log in.'}, status=200)