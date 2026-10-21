# Demo video script (~5 minutes)

Record on a phone (or Chrome DevTools at 390px) with the deployed URL. Speak Persian; keep it calm and concrete.
Tip: record during Tehran shop hours (≈10:00–20:00) so calls happen live; outside hours use the
«همین الان امتحان کن (اجرای نمایشی)» button that the app offers.

Before recording: open `/seller` on a **second device / browser**, so the two-sided moment works.

| Time | Screen | What to show / say |
|---|---|---|
| 0:00–0:25 | Home | «خرید حضوری تو تهران سخته: نمی‌دونی کدوم پاساژ داره، قیمت ترب به‌روزه یا نه، مغازه بازه یا نه. میزان این چهار قدم رو برات انجام میده.» Point at the 4-step strip. |
| 0:25–1:05 | Ask → Search | Tap/say «هدفون انکر زیر ۵ میلیون قسطی». Show «فهمیدم…» bubble: query, budget, installment became filters. Change a filter chip (e.g. «الان باز»), results update. Show «منظورت کدومه؟» on a broad query like «گوشی سامسونگ». Tick two products → «مقایسه کن» → compare table + «پیشنهاد میزان». |
| 1:05–2:05 | Product → where to buy | Set «از کجا میای؟» → «شیخ هادی». Shop cards re-rank: distance + walking time, open now/closes at, **exact passage/floor/unit**, reasons («ارزون‌ترین»، «نزدیک‌ترین»، «قسطی: اسنپ‌پی»). Open «این قیمت‌ها یعنی چی؟»: listed ≠ confirmed ≠ stock. Toggle map view. **Hero: «پاساژنما»** — open «شارژر اپل ۲۰ وات»: 16 shops in پاساژ علاالدین drawn floor by floor (price, open/closed, cheapest) → «میزان به ۵ فروشگاهِ همین پاساژ زنگ بزنه». Show «شاید داشته باشن» (category-only shops). Tap a closed shop → **plan B**: «الان بسته‌ست؛ این‌ها بازن و همین کالا رو دارن» (nearest open shops, same passage). |
| 2:05–3:20 | Agent calls | «میزان به ۳ فروشگاه زنگ بزنه» → pick asks (قیمت نهایی، نگه‌داشتن، قسطی) + custom question. Live transcripts; a closed / out-of-stock shop gets **replaced automatically** by the nearest one in the same passage. On the second device, the seller panel rings → «موجوده» + price + «۱ ساعت نگه می‌دارم» → the shopper's screen updates instantly. |
| 3:20–4:10 | Recommendation & visit plan | **Hero: «کارنامه‌ی میزان»** appears when the calls end (calls made, dead-end trips avoided, time freed, money vs. Tehran). Green card: confirmed price, hold time, «حداکثر تا … راه بیفت», traffic-zone tip, Neshan / Balad / Google buttons, checklist. «بفرست برای کسی» shares shop + exact address + price + Neshan link. «دارم میرم» → status in «پیگیری». **Hero: «کارت فروشنده»** — full-screen card for the counter (confirmed price, call time, hold, 4-digit code). «دوباره بپرس» re-calls before leaving. |
| 4:10–4:40 | Tracking & follow-up | «پیگیری» tab: all missions. Show a no-stock mission: «وقتی باز شدن به … فروشگاه بسته زنگ بزن» (scheduled for opening time). After buying: «خریدم» → enter final price → it becomes a shopper-confirmed price for others. |
| 4:40–5:00 | In the shop + wrap-up | «تو مغازه» → X-ray sample shelf: green/yellow/red vs Tehran prices. Close: «۶٬۴۷۶ فروشگاه و ۲۲۶ هزار کالای ترب، روی لیارا؛ داده شفاف، ایجنت پیگیر.» |

Things to say about data honesty (judges score it): names and phone numbers in the dataset are synthetic, so the
shop side of calls is simulated from the data (hours, price age, category-only shops) unless a seller answers
from the panel; every price shows whether it is listed (and how old) or confirmed (by whom, when).
