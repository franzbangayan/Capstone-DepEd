from django.db import migrations, models
import django.db.models.deletion


def ensure_no_unassigned_curriculum(apps, schema_editor):
    database = schema_editor.connection.alias
    for model_name in ('Subject', 'SchoolYear'):
        model = apps.get_model('core', model_name)
        if model.objects.using(database).exists():
            raise RuntimeError(
                f'Cannot add required school ownership while {model_name} '
                'records exist. Assign or remove those records, then rerun '
                'the migration.'
            )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_teacherspecialization_strand'),
    ]

    operations = [
        migrations.RunPython(
            ensure_no_unassigned_curriculum,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name='schoolyear',
            name='school',
            field=models.ForeignKey(
                db_column='school_id',
                on_delete=django.db.models.deletion.CASCADE,
                to='core.school',
            ),
        ),
        migrations.AddField(
            model_name='subject',
            name='school',
            field=models.ForeignKey(
                db_column='school_id',
                on_delete=django.db.models.deletion.CASCADE,
                to='core.school',
            ),
        ),
        migrations.AlterField(
            model_name='schoolyear',
            name='is_active',
            field=models.BooleanField(
                default=False,
                help_text='Only one SchoolYear per school should be active at a time; switching is a manual action performed by the principal.',
            ),
        ),
    ]
