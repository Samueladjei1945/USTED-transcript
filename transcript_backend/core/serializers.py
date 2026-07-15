from rest_framework import serializers
from .models import Student, Admin, Semester, Course, TranscriptRequest, SupportTicket


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'code', 'title', 'credit', 'grade']


class SemesterSerializer(serializers.ModelSerializer):
    courses = CourseSerializer(many=True, read_only=True)

    class Meta:
        model = Semester
        fields = ['id', 'name', 'courses']


class StudentSerializer(serializers.ModelSerializer):
    semesters = SemesterSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'email', 'year', 'gpa', 'status', 'semesters']


class StudentListSerializer(serializers.ModelSerializer):
    request_count = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'email', 'year', 'gpa', 'status', 'request_count', 'created_at']

    def get_request_count(self, obj):
        return TranscriptRequest.objects.filter(student=obj).count()


class SupportTicketSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = SupportTicket
        fields = ['id', 'student', 'student_name', 'student_id', 'subject', 'message', 'status', 'admin_response', 'responded_at', 'responded_by', 'created_at', 'updated_at']
        read_only_fields = ['student', 'responded_at', 'responded_by']


class TranscriptRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = TranscriptRequest
        fields = ['id', 'student_id', 'student_name', 'purpose', 'transcript_type', 'momo_name', 'momo_number', 'telephone', 'address', 'total_amount', 'notes', 'payment_reference', 'status', 'created_at', 'reviewed_at', 'document']