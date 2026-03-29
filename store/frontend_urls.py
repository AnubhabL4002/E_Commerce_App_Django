from django.urls import path
from django.shortcuts import render

def index(request):
    return render(request, 'store/index.html')

urlpatterns = [
    path('', index, name='index'),
]
