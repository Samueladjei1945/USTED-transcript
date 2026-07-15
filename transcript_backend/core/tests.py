from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Admin, Student, TranscriptRequest


class TranscriptWorkflowTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(username='admin1', password='pass123', email='admin@example.com')
        self.student_user = User.objects.create_user(username='student1', password='pass123', email='student@example.com')

        Admin.objects.create(user=self.admin_user, name='Admin User', email='admin.profile@example.com')
        self.student = Student.objects.create(
            user=self.student_user,
            student_id='UST12345',
            name='Student User',
            email='student.profile@example.com',
            year='Level 400',
        )

        self.request = TranscriptRequest.objects.create(
            student=self.student,
            purpose='Scholarship',
            transcript_type='Standard Transcript',
            total_amount='50.00',
            payment_reference='SIM-REQ-001',
            status='Pending Review',
        )

    def test_admin_cannot_skip_review_stage(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            f'/api/admin/requests/{self.request.id}/status/',
            {'status': 'Approved'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid transition', str(response.data.get('error')))

    def test_reject_requires_reason(self):
        self.request.status = 'Under Review'
        self.request.save(update_fields=['status'])
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            f'/api/admin/requests/{self.request.id}/status/',
            {'status': 'Rejected'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rejection_reason', str(response.data.get('error')))

    def test_reject_with_reason_is_saved_and_returned(self):
        self.request.status = 'Under Review'
        self.request.save(update_fields=['status'])
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            f'/api/admin/requests/{self.request.id}/status/',
            {'status': 'Rejected', 'rejection_reason': 'Missing required identity document.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'Rejected')
        self.assertEqual(self.request.rejection_reason, 'Missing required identity document.')
        self.assertEqual(response.data.get('rejection_reason'), 'Missing required identity document.')

    def test_upload_document_marks_request_completed(self):
        self.request.status = 'Approved'
        self.request.save(update_fields=['status'])
        self.client.force_authenticate(user=self.admin_user)
        pdf_file = SimpleUploadedFile('transcript.pdf', b'%PDF-1.4 test content', content_type='application/pdf')

        response = self.client.post(
            f'/api/admin/requests/{self.request.id}/upload-document/',
            {'document': pdf_file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'Completed')
        self.assertIsNotNone(self.request.completed_at)

    def test_paid_submission_creates_pending_review_request(self):
        self.client.force_authenticate(user=self.student_user)

        response = self.client.post(
            '/api/student/requests/verify-and-create/',
            {
                'reference': 'SIM-NEW-REQ-01',
                'purpose': 'Employment',
                'transcript_type': 'Standard Transcript',
                'total_amount': '55.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get('status'), 'Pending Review')
