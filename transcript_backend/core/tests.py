from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Student, TranscriptRequest


class VerifyAndCreateRequestTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='student@example.com',
            email='student@example.com',
            password='password123',
        )
        self.student = Student.objects.create(
            user=self.user,
            student_id='IDX12345',
            name='Test Student',
            email='student@example.com',
            year='Level 300',
            gpa=Decimal('3.50'),
            status='Active',
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse('verify_and_create_request')
        self.payload = {
            'reference': 'REF-123456',
            'purpose': 'Official transcript request',
            'total_amount': '150.00',
            'transcript_type': 'Official',
            'notes': 'Urgent processing',
        }

    def test_rejects_reused_payment_reference(self):
        TranscriptRequest.objects.create(
            student=self.student,
            purpose='Existing request',
            total_amount=Decimal('150.00'),
            payment_reference='REF-123456',
            status='Pending',
        )

        with patch('core.views.http_requests.get') as mock_get:
            response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Payment reference has already been used.')
        mock_get.assert_not_called()

    @patch('core.views.http_requests.get')
    def test_rejects_payment_for_different_email(self, mock_get):
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            'status': True,
            'data': {
                'status': 'success',
                'amount': 15000,
                'customer': {'email': 'other@student.com'},
            },
        }
        mock_get.return_value = mock_response

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Payment does not belong to the authenticated student.')
        self.assertEqual(TranscriptRequest.objects.count(), 0)

    @patch('core.views.http_requests.get')
    def test_rejects_payment_with_mismatched_amount(self, mock_get):
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            'status': True,
            'data': {
                'status': 'success',
                'amount': 10000,
                'customer': {'email': 'student@example.com'},
            },
        }
        mock_get.return_value = mock_response

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Payment amount does not match request total.')
        self.assertEqual(TranscriptRequest.objects.count(), 0)

    @patch('core.views.send_mail')
    @patch('core.views.http_requests.get')
    def test_creates_request_when_verification_matches(self, mock_get, _mock_send_mail):
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            'status': True,
            'data': {
                'status': 'success',
                'amount': 15000,
                'customer': {'email': 'student@example.com'},
            },
        }
        mock_get.return_value = mock_response

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TranscriptRequest.objects.count(), 1)
        created = TranscriptRequest.objects.get()
        self.assertEqual(created.payment_reference, 'REF-123456')
        self.assertEqual(created.total_amount, Decimal('150.00'))
