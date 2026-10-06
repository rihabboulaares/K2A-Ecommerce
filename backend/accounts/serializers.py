import re

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Address, CustomerProfile

from .models import CustomerProfile


User = get_user_model()


def normalize_phone(value):
    value = (value or "").strip()
    phone = re.sub(r"[\s().-]", "", value)

    if phone.startswith("00"):
        phone = "+" + phone[2:]

    if not re.fullmatch(r"\+?\d{8,15}", phone):
        raise serializers.ValidationError(
            "Saisissez un numéro de téléphone valide."
        )

    return phone


class CustomerSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(
        source="customer_profile.phone",
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "phone",
            "is_active",
        )


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_phone(self, value):
        phone = normalize_phone(value)

        if CustomerProfile.objects.filter(phone=phone).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone est déjà utilisé."
            )

        return phone

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm":
                    "Les mots de passe ne correspondent pas."
            })

        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "password": list(exc.messages)
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirm")

        phone = validated_data.pop("phone")
        password = validated_data.pop("password")

        # Identifiant Django interne.
        # Le client ne l'utilise jamais pour se connecter.
        base_username = f"customer_{phone.replace('+', '')}"
        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            counter += 1
            username = f"{base_username}_{counter}"

        user = User.objects.create_user(
            username=username,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=password,
            is_staff=False,
        )

        CustomerProfile.objects.create(
            user=user,
            phone=phone,
        )

        return user


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        phone = normalize_phone(attrs["phone"])

        try:
            profile = CustomerProfile.objects.select_related(
                "user"
            ).get(phone=phone)
        except CustomerProfile.DoesNotExist:
            raise serializers.ValidationError(
                "Numéro de téléphone ou mot de passe incorrect."
            )

        user = authenticate(
            request=self.context.get("request"),
            username=profile.user.username,
            password=attrs["password"],
        )

        if user is None or not user.is_active:
            raise serializers.ValidationError(
                "Numéro de téléphone ou mot de passe incorrect."
            )

        if user.is_staff or user.is_superuser:
            raise serializers.ValidationError(
                "Utilisez l'espace administrateur pour ce compte."
            )

        refresh = RefreshToken.for_user(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": CustomerSerializer(user).data,
        }


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
        )


class AddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = Address

        fields = (
            "id",
            "address",
            "city",
            "postal_code",
            "phone",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    def validate_phone(self, value):
        return normalize_phone(value)