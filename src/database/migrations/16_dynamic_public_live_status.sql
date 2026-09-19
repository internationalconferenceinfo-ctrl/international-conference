CREATE OR REPLACE VIEW public.conferences_public
WITH (security_barrier = true)
AS
SELECT
  c.id,
  c.title,
  c.short_title,
  c.category,
  c.sub_category,
  c.slug,
  c.country,
  c.state,
  c.city,
  c.location,
  c.address,
  c.start_date,
  c.end_date,
  c.deadline,
  c.time_zone,
  c.description,
  c.full_description,
  c.status,

  CASE
    WHEN
      c.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND
      COALESCE(
        NULLIF(TRIM(c.end_date), ''),
        c.start_date
      ) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    THEN
      CASE
        WHEN NOW() <
          (
            c.start_date::date::timestamp
            AT TIME ZONE COALESCE(
              (
                SELECT name
                FROM pg_timezone_names
                WHERE name = NULLIF(TRIM(c.time_zone), '')
                LIMIT 1
              ),
              'UTC'
            )
          )
        THEN 'Upcoming'

        WHEN NOW() >=
          (
            (
              COALESCE(
                NULLIF(TRIM(c.end_date), ''),
                c.start_date
              )::date + 1
            )::timestamp
            AT TIME ZONE COALESCE(
              (
                SELECT name
                FROM pg_timezone_names
                WHERE name = NULLIF(TRIM(c.time_zone), '')
                LIMIT 1
              ),
              'UTC'
            )
          )
        THEN 'Completed'

        ELSE 'Ongoing'
      END

    ELSE COALESCE(c.live_status, 'Upcoming')
  END AS live_status,

  c.is_deactivated,
  c.is_featured,
  c.is_verified,
  c.organizer_id,
  c.organizer_name,
  c.organizer_website,
  c.conference_website,
  c.event_url,
  c.registration_url,
  c.registration_link,
  c.banner_image,
  c.views_count,
  c.registration_clicks,
  c.attendance_type,
  c.is_online,
  c.created_at,
  c.updated_at

FROM public.conferences c
WHERE
  c.status = 'Approved'
  AND COALESCE(c.is_deactivated, false) = false;