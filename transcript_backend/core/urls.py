from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('role/', views.get_role, name='get_role'),
    path('student/profile/', views.get_student_profile, name='student_profile'),
    path('student/profile/update/', views.update_student_profile, name='update_student_profile'),
    path('student/requests/', views.get_student_requests, name='student_requests'),
    path('student/requests/submit/', views.submit_request, name='submit_request'),
    path('student/requests/initialize-payment/', views.initialize_payment, name='initialize_payment'),
    path('student/requests/verify-and-create/', views.verify_and_create_request, name='verify_and_create_request'),
    path('admin/analytics/', views.get_admin_analytics, name='admin_analytics'),
    path('admin/requests/export/', views.export_requests_csv, name='export_requests_csv'),
    path('admin/requests/', views.get_all_requests, name='all_requests'),
    path('admin/requests/bulk-status/', views.bulk_update_request_status, name='bulk_status'),
    path('admin/requests/<int:req_id>/status/', views.update_request_status, name='update_status'),
    path('admin/students/', views.get_all_students, name='all_students'),
    path('admin/students/<int:student_id>/', views.get_student_detail, name='student_detail'),
    path('admin/students/export/', views.export_students_csv, name='export_students_csv'),
    path('register/', views.register_student, name='register'),
    path('prices/', views.get_service_prices, name='service_prices'),
    path('student/cgpa/<str:student_id>/', views.lookup_cgpa, name='lookup_cgpa'),
    path('password-reset/', views.password_reset, name='password_reset'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
]
