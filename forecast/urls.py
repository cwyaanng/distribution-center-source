# forecast/urls.py
from django.urls import path
from .views import predict_view , schedule_week_view , ai_analysis_view

urlpatterns = [
    path('predict/<int:year>/', predict_view, name='predict'),
    path('schedule/<int:year>/<int:week>/', schedule_week_view, name='schedule_week'),
    path('ai-analysis/', ai_analysis_view, name='ai_analysis')
]

