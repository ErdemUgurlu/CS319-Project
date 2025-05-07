from django.apps import AppConfig


class ProctoringConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'proctoring'

    # def ready(self):
    #     import proctoring.signals # noqa
