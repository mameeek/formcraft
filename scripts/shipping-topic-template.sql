-- Adds a dedicated "วิธีรับสินค้า" (shipping) topic to an existing form —
-- the same layout verified on the "s" test form this session: a real
-- 'shipping' field type in its own topic, with an address topic that only
-- shows when delivery is selected.
--
-- HOW TO USE (Supabase SQL editor):
-- 1. Replace <FORM_ID> and run this SELECT to see your form's current
--    sections array:
select data->'sections' from form_config where id = '<FORM_ID>';

-- 2. Copy that JSON array into a text editor. Paste in a new topic object
--    wherever you want the shipping step to appear (order in the array =
--    order on the form), using this shape — the field's "id" can be any
--    short unique string, just remember it for step 4:
--
-- {
--   "id": "ship01",
--   "title": "วิธีรับสินค้า",
--   "fields": [
--     {
--       "id": "shipfld1",
--       "type": "shipping",
--       "label": "วิธีรับสินค้า",
--       "placeholder": "",
--       "required": true,
--       "width": "full",
--       "options": ["รับที่สถานที่", "จัดส่งทางไปรษณีย์"],
--       "shippingCost": 0
--     }
--   ]
-- }
--
-- 3. If you have an address topic that should only show for delivery, add
--    (or replace) its "condition" key with:
--
-- "condition": { "fieldId": "shipfld1", "operator": "equals", "value": "จัดส่งทางไปรษณีย์" }
--
--    (must match the shipping field's "id" from step 2 exactly)
--
-- 4. Paste the FULL edited array back in place of <PASTE_ARRAY_HERE> below
--    and run it. This replaces the whole sections array, so make sure
--    nothing else was accidentally dropped when you copied/edited it.
update form_config
set data = jsonb_set(data, '{sections}', '<PASTE_ARRAY_HERE>'::jsonb)
where id = '<FORM_ID>';

-- 5. Verify:
select data->'sections' from form_config where id = '<FORM_ID>';
