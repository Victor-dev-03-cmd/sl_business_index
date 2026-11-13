\set ON_ERROR_STOP on
DO $verify$
DECLARE invalid boolean;
BEGIN
 INSERT INTO public.businesses(id,status,address,detailed_address,latitude,longitude,location)
 VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','pending',
 'Galle, Southern Province, Sri Lanka','Opposite railway station, Galle',
 6.03,80.22,ST_SetSRID(ST_MakePoint(80.22,6.03),4326)::geography);

 invalid:=false;
 BEGIN
  INSERT INTO public.businesses(id,address,detailed_address,latitude,longitude,location)
  VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'Jaffna, Northern Province, Sri Lanka',NULL,
    9.6615,80.0255,ST_SetSRID(ST_MakePoint(80.0255,9.6615),4326)::geography);
 EXCEPTION WHEN invalid_parameter_value THEN invalid:=true;
 END;
 IF NOT invalid THEN RAISE EXCEPTION 'New business without physical address was accepted'; END IF;

 invalid:=false;
 BEGIN
  INSERT INTO public.businesses(id,address,detailed_address,latitude,longitude,location)
  VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   '9.6615, 80.0255','No 12, Main Street, Jaffna',
    9.6615,80.0255,ST_SetSRID(ST_MakePoint(80.0255,9.6615),4326)::geography);
 EXCEPTION WHEN invalid_parameter_value THEN invalid:=true;
 END;
 IF NOT invalid THEN RAISE EXCEPTION 'Numeric-only area address was accepted'; END IF;

 invalid:=false;
 BEGIN
  INSERT INTO public.businesses(id,address,detailed_address,latitude,longitude,location)
  VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff',
   'Colombo, Western Province, Sri Lanka','12 Galle Road, Colombo',
    80.0255,9.6615,ST_SetSRID(ST_MakePoint(9.6615,80.0255),4326)::geography);
 EXCEPTION WHEN invalid_parameter_value THEN invalid:=true;
 END;
 IF NOT invalid THEN RAISE EXCEPTION 'Swapped latitude/longitude was accepted'; END IF;

 invalid:=false;
 BEGIN
  INSERT INTO public.businesses(id,address,detailed_address,latitude,longitude,location)
  VALUES ('aabbccdd-0000-4000-8000-123456789abc',
   'Jaffna, Northern Province, Sri Lanka','No 12, Main Street, Jaffna',
    9.6615,80.0255,ST_SetSRID(ST_MakePoint(79.9,9.6615),4326)::geography);
 EXCEPTION WHEN invalid_parameter_value THEN invalid:=true;
 END;
 IF NOT invalid THEN RAISE EXCEPTION 'Geography mismatch was accepted'; END IF;

 -- Admin/status-only edits to older legacy rows remain possible.
 UPDATE public.businesses SET status='pending'
  WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 IF (SELECT status FROM public.businesses WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>'pending'
 THEN RAISE EXCEPTION 'Old listing status update blocked'; END IF;

 invalid:=false;
 BEGIN
   UPDATE public.businesses SET address='Jaffna, Northern Province, Sri Lanka'
    WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 EXCEPTION WHEN invalid_parameter_value THEN invalid:=true;
 END;
 IF NOT invalid THEN RAISE EXCEPTION 'Legacy listing address changed without physical correction'; END IF;

 UPDATE public.businesses SET detailed_address='Shop 5, Hospital Road, Jaffna'
 WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 IF (SELECT detailed_address FROM public.businesses
 WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') IS NULL
 THEN RAISE EXCEPTION 'Legacy listing cannot be remediated'; END IF;
END
$verify$;
SELECT 'SLBI physical business address/geography guard disposable tests passed' AS result;
