from django.contrib import admin
from .models import Student, Admin, Semester, Course, TranscriptRequest, ServicePrice

admin.site.site_header = "USTED Administration"
admin.site.site_title = "USTED Admin"

admin.site.register(Student)
admin.site.register(Admin)
admin.site.register(Semester)
admin.site.register(Course)
admin.site.register(TranscriptRequest)

@admin.register(ServicePrice)
class ServicePriceAdmin(admin.ModelAdmin):
    list_display = ("category", "label", "price", "is_active", "order")
    list_editable = ("price", "is_active", "order")
    list_filter = ("category", "is_active")
    search_fields = ("label",)