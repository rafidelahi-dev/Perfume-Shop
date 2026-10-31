-- Bangla names for notes (2026-10-26). Null = keep the English name (loanwords
-- people already say in English: chocolate, coffee, musk, amber, vanilla...).
alter table public.notes add column if not exists name_bn text;

update public.notes n set name_bn = v.bn
from (values
  ('almond','কাঠবাদাম'),('bitter almond','তেতো কাঠবাদাম'),('anise','মৌরি'),
  ('apple','আপেল'),('green apple','সবুজ আপেল'),('apricot','খুবানি'),
  ('basil','তুলসী'),('bulgarian rose','বুলগেরিয়ান গোলাপ'),
  ('cardamom','এলাচ'),('carrot','গাজর'),('cinnamon','দারুচিনি'),('clove','লবঙ্গ'),
  ('coconut','নারকেল'),('coconut milk','নারকেলের দুধ'),('coconut water','ডাবের পানি'),
  ('coriander','ধনিয়া'),('cotton candy','হাওয়াই মিঠাই'),('cumin','জিরা'),
  ('dried fruits','শুকনো ফল'),('dry wood','শুকনো কাঠ'),
  ('fig','ডুমুর'),('fig leaf','ডুমুর পাতা'),('frangipani','কাঠগোলাপ'),
  ('frankincense','লোবান'),('fruity notes','ফলের নোট'),
  ('ginger','আদা'),('grapefruit','জাম্বুরা'),('green leaves','সবুজ পাতা'),
  ('green notes','সবুজ নোট'),('guava','পেয়ারা'),
  ('hibiscus','জবা'),('honey','মধু'),('incense','ধূপ'),
  ('jasmine','জুঁই'),('jasmine sambac','বেলি'),
  ('leather','চামড়া'),('lemon','লেবু'),('lemon zest','লেবুর খোসা'),('lime','কাগজি লেবু'),
  ('litchi','লিচু'),('lychee','লিচু'),('lotus','পদ্ম'),
  ('mandarin','কমলা'),('mandarin orange','কমলা'),('mango','আম'),
  ('marine notes','সামুদ্রিক নোট'),('milk','দুধ'),('mint','পুদিনা'),('moss','শ্যাওলা'),
  ('nutmeg','জায়ফল'),('orange','কমলা'),('sweet orange','মিষ্টি কমলা'),
  ('orchid','অর্কিড'),('oud','আগর'),('agarwood (oud)','আগর'),
  ('pear','নাশপাতি'),('pepper','গোলমরিচ'),('pineapple','আনারস'),('pistachio','পেস্তা'),
  ('plum','আলুবোখারা'),('pomegranate','ডালিম'),('pomelo','জাম্বুরা'),
  ('red fruits','লাল ফল'),('rose','গোলাপ'),
  ('saffron','জাফরান'),('sand','বালি'),('sandalwood','চন্দন'),
  ('sea notes','সামুদ্রিক নোট'),('sea water','সমুদ্রের পানি'),
  ('spices','মসলা'),('spicy notes','মসলার নোট'),('star anise','তারা মৌরি'),
  ('sugar','চিনি'),('sugar cane','আখ'),
  ('tobacco','তামাক'),('tobacco leaf','তামাক পাতা'),('tuberose','রজনীগন্ধা'),
  ('vetiver','খসখস'),('water lily','শাপলা'),('watermelon','তরমুজ'),
  ('white blossom','সাদা ফুল'),('white florals','সাদা ফুল'),('white flowers','সাদা ফুল'),
  ('woody notes','কাঠের নোট'),('woodsy notes','কাঠের নোট'),('yellow fruits','হলুদ ফল')
) as v(en, bn)
where n.name = v.en;
