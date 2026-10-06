from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AddressDetailView,
    AddressListCreateView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    path(
        "refresh/",
        TokenRefreshView.as_view(),
        name="refresh",
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),

    path(
        "me/",
        MeView.as_view(),
        name="me",
    ),

    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password",
    ),

    path(
        "addresses/",
        AddressListCreateView.as_view(),
        name="address-list",
    ),

    path(
        "addresses/<int:pk>/",
        AddressDetailView.as_view(),
        name="address-detail",
    ),
]