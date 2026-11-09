from django.urls import path

from .apis import summary

urlpatterns = [
    path("summary/", summary, name="dashboard-summary"),
]
