import sys

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, '::', a[:100]); sys.exit(1)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

# ---------- Stats ----------
sub('src/app/(tabs)/stats.tsx', [
 ("import { useSettings } from '../../store';", "import { tr, weekdayLetter } from '../../i18n';\nimport { useSettings } from '../../store';"),
 ("const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;", "const hourLabel = (h: number) => `${h}:00`;"),
 ("(id === 0 ? 'No task' : known(id)?.name ?? 'Deleted task')", "(id === 0 ? tr('No task') : known(id)?.name ?? tr('Deleted task'))"),
 ("['Streak', `${d.streak.current}d`], ['Best streak', `${d.streak.best}d`],", "['Streak', tr('{n}d', { n: d.streak.current })], ['Best streak', tr('{n}d', { n: d.streak.best })],"),
 ("{id == null ? 'All topics' : known(id)?.name}", "{id == null ? tr('All topics') : known(id)?.name}"),
 ("<Txt v=\"small\" c={on ? '#1A1206' : t.text} style={{ fontFamily: font.bodyBold }}>", "<Txt v=\"small\" raw c={on ? '#1A1206' : t.text} style={{ fontFamily: font.bodyBold }}>"),
 ("<Txt v=\"h3\" c={on ? '#1A1206' : t.text}>{nameOf(id)}</Txt>", "<Txt v=\"h3\" raw c={on ? '#1A1206' : t.text}>{nameOf(id)}</Txt>"),
 ("<Txt v=\"label\">{active == null ? 'Today vs goal' : `${topic != null ? known(topic)?.name : nameOf(active)} today vs goal`}</Txt>", "<Txt v=\"label\" raw>{active == null ? tr('Today vs goal') : tr('{name} today vs goal', { name: (topic != null ? known(topic)?.name : nameOf(active)) ?? '' })}</Txt>"),
 ("<Txt v=\"small\">of {fmtDur(goal)}</Txt>", "<Txt v=\"small\" raw>{tr('of {t}', { t: fmtDur(goal) })}</Txt>"),
 ("<Txt v=\"small\">All-time {active == null ? '' : `on ${topic != null ? known(topic)?.name : nameOf(active)} `}· {fmtDur(d.allTime)}</Txt>", "<Txt v=\"small\" raw>{`${tr('All time')}${active == null ? '' : ` · ${topic != null ? known(topic)?.name : nameOf(active)}`} · ${fmtDur(d.allTime)}`}</Txt>"),
 ("<Txt v=\"label\" numberOfLines={1}>{k}</Txt><Txt v=\"h2\">{v}</Txt>", "<Txt v=\"label\" numberOfLines={1}>{k}</Txt><Txt v=\"h2\" raw>{v}</Txt>"),
 ("label: WEEKDAY[new Date(x.ts).getDay()]", "label: weekdayLetter(new Date(x.ts).getDay())"),
 ("<Txt v=\"h2\">{d.q.avg.toFixed(1)} / 5 <Txt v=\"small\">· {d.q.n} rated</Txt></Txt>", "<Txt v=\"h2\" raw>{`${d.q.avg.toFixed(1)} / 5`}<Txt v=\"small\" raw>{` · ${tr('{n} rated', { n: d.q.n })}`}</Txt></Txt>"),
 ("<Txt v=\"small\">Best around {hourLabel(d.q.bestHour)} ({d.q.bestAvg.toFixed(1)} avg)</Txt>", "<Txt v=\"small\" raw>{tr('Best around {h} ({avg} avg)', { h: hourLabel(d.q.bestHour), avg: d.q.bestAvg.toFixed(1) })}</Txt>"),
 ("<Txt v=\"small\">Weakest subject: {nameOf(d.q.weak.id)} ({d.q.weak.avg.toFixed(1)} avg)</Txt>", "<Txt v=\"small\" raw>{tr('Weakest subject: {name} ({avg} avg)', { name: nameOf(d.q.weak.id), avg: d.q.weak.avg.toFixed(1) })}</Txt>"),
 ("<Txt v=\"label\">{active == null ? 'By subject' : 'By topic'} · {range === 'all' ? 'all time' : `last ${range} days`}</Txt>", "<Txt v=\"label\" raw>{`${tr(active == null ? 'By subject' : 'By topic')} · ${range === 'all' ? tr('All time') : tr('Last {n} days', { n: range })}`}</Txt>"),
 ("<Txt v=\"h3\">{active != null && id === active ? 'Whole subject' : active != null ? known(id)?.name ?? 'Deleted topic' : nameOf(id)}</Txt><Txt v=\"small\">{fmtDur(ms)} · {Math.round((ms / (d.total || 1)) * 100)}%</Txt>", "<Txt v=\"h3\" raw>{active != null && id === active ? tr('Whole subject') : active != null ? known(id)?.name ?? tr('Deleted topic') : nameOf(id)}</Txt><Txt v=\"small\" raw>{`${fmtDur(ms)} · ${Math.round((ms / (d.total || 1)) * 100)}%`}</Txt>"),
 ("<Txt v=\"small\" style={{ paddingHorizontal: space(4) }}>Best day: {fmtDate(d.best.key)} · {fmtDur(d.best.ms)}</Txt>", "<Txt v=\"small\" raw style={{ paddingHorizontal: space(4) }}>{`${tr('Best day')}: ${fmtDate(d.best.key)} · ${fmtDur(d.best.ms)}`}</Txt>"),
 ("{d.q.bestHour != null &&", "{d.q.bestHour != null &&"),
])
sub('src/components/charts.tsx', [("import { font, useTheme } from '../theme';", "import { font, useTheme } from '../theme';")])

# ---------- Study ----------
sub('src/app/(tabs)/study.tsx', [
 ("import { ago, daysUntil, fmtDate, fmtDur }", "import { agoLabel, tr } from '../../i18n';\nimport { daysUntil, fmtDate, fmtDur }"),
 ("Alert.alert(`Delete \"${name}\"?`, 'Past focus time stays in your stats.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => done(fn) }]);", "Alert.alert(tr('Delete \"{name}\"?', { name }), tr('Past focus time stays in your stats.'), [{ text: tr('Cancel'), style: 'cancel' }, { text: tr('Delete'), style: 'destructive', onPress: () => done(fn) }]);"),
 ("<Txt v=\"h3\">{dueCards ? `${dueCards} due now` : 'Nothing due'} · {cards.length} total</Txt>", "<Txt v=\"h3\">{`${dueCards ? tr('{n} due now', { n: dueCards }) : tr('Nothing due')} · ${tr('{n} total', { n: cards.length })}`}</Txt>"),
 ("<Txt v=\"h3\">{e.name}</Txt>", "<Txt v=\"h3\" raw>{e.name}</Txt>"),
 ("{days < 0 ? 'passed' : days === 0 ? 'today' : `${days}d`}</Txt>", "{days < 0 ? tr('passed') : days === 0 ? tr('today') : tr('{n}d', { n: days })}</Txt>"),
 ("<Txt v=\"small\">{sub?.name ?? 'Subject deleted'} · {fmtDate(e.date)}</Txt>", "<Txt v=\"small\" raw>{`${sub?.name ?? tr('Subject deleted')} · ${fmtDate(e.date)}`}</Txt>"),
 ("<Txt v=\"small\">{c.done}/{c.total} topics covered{days > 0 && left > 0 ? ` · ~${(left / days).toFixed(1)} topics/day to finish` : ''}</Txt>", "<Txt v=\"small\" raw>{`${tr('{done}/{total} topics covered', { done: c.done, total: c.total })}${days > 0 && left > 0 ? ` · ${tr('~{n} topics/day to finish', { n: (left / days).toFixed(1) })}` : ''}`}</Txt>"),
 ("<Txt v=\"h3\">{s.name}</Txt>", "<Txt v=\"h3\" raw>{s.name}</Txt>"),
 ("<Txt v=\"small\">{fmtDur(a.ms)} · {a.last ? `last ${ago(a.last)}` : 'never studied'}{c.total ? ` · ${c.done}/${c.total} covered` : ''}</Txt>", "<Txt v=\"small\" raw>{`${fmtDur(a.ms)} · ${a.last ? tr('last {when}', { when: agoLabel(a.last) }) : tr('never studied')}${c.total ? ` · ${tr('{done}/{total} covered', { done: c.done, total: c.total })}` : ''}`}</Txt>"),
 ("opacity: k.done ? 0.6 : 1 }}>{k.name}</Txt>", "opacity: k.done ? 0.6 : 1 }} raw>{k.name}</Txt>"),
 ("<Txt v=\"small\">{x ? `${fmtDur(x.ms)} · last ${ago(x.last)}` : 'not studied yet'}</Txt>", "<Txt v=\"small\" raw>{x ? `${fmtDur(x.ms)} · ${tr('last {when}', { when: agoLabel(x.last) })}` : tr('not studied yet')}</Txt>"),
 ("<Txt v=\"small\">Exam date{ed ? `: ${fmtDate(ed)}` : ''}</Txt>", "<Txt v=\"small\" raw>{`${tr('Exam date')}${ed ? `: ${fmtDate(ed)}` : ''}`}</Txt>"),
 ("<Txt v=\"h3\" c={es === k.id ? '#1A1206' : t.text}>{k.name}</Txt>", "<Txt v=\"h3\" raw c={es === k.id ? '#1A1206' : t.text}>{k.name}</Txt>"),
 ("placeholder=\"New topic\"", "placeholder={tr('New topic')}"),
 ("placeholder=\"New subject\"", "placeholder={tr('New subject')}"),
 ("placeholder=\"Name (e.g. Physics midterm)\"", "placeholder={tr('Name (e.g. Physics midterm)')}"),
])

# ---------- Cards ----------
sub('src/app/cards.tsx', [
 ("import { useSettings } from '../store';", "import { tr } from '../i18n';\nimport { useSettings } from '../store';"),
 ("(id === 0 ? 'No subject' : tasks.find((k) => k.id === id)?.name ?? 'Deleted')", "(id === 0 ? tr('No subject') : tasks.find((k) => k.id === id)?.name ?? tr('Deleted'))"),
 ("Alert.alert('Nothing imported', 'Use one card per line: front, then a tab or comma, then back.')", "Alert.alert(tr('Nothing imported'), tr('Use one card per line: front, then a tab or comma, then back.'))"),
 ("Alert.alert('Imported', `${rows.length} cards added to ${nameOf(sel)}.`);", "Alert.alert(tr('Imported'), tr('{n} cards added to {name}.', { n: rows.length, name: nameOf(sel) }));"),
 ("Alert.alert('Import failed', String(e))", "Alert.alert(tr('Import failed'), String(e))"),
 ("Alert.alert('Delete card?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive',", "Alert.alert(tr('Delete card?'), undefined, [{ text: tr('Cancel'), style: 'cancel' }, { text: tr('Delete'), style: 'destructive',"),
 ("label={queue.length ? `Review ${queue.length}` : 'Nothing to review'}", "label={queue.length ? tr('Review {n}', { n: queue.length }) : 'Nothing to review'}"),
 ("<Txt v=\"small\">New today {today.fresh}/{cfg.newPerDay} · reviews {today.reviews}/{cfg.reviewsPerDay}{due.length > queue.length ? ` · ${due.length - queue.length} more waiting (daily limit)` : ''}. Change limits in Settings.</Txt>", "<Txt v=\"small\" raw>{`${tr('New today')} ${today.fresh}/${cfg.newPerDay} · ${tr('reviews')} ${today.reviews}/${cfg.reviewsPerDay}${due.length > queue.length ? ` · ${tr('{n} more waiting (daily limit)', { n: due.length - queue.length })}` : ''}. ${tr('Change limits in Settings.')}`}</Txt>"),
 ("<Txt v=\"h3\" numberOfLines={2}>{c.front || '(image)'}</Txt>", "<Txt v=\"h3\" numberOfLines={2} raw>{c.front || tr('(image)')}</Txt>"),
 ("<Txt v=\"small\" numberOfLines={2}>{c.back || '(image)'}</Txt>", "<Txt v=\"small\" numberOfLines={2} raw>{c.back || tr('(image)')}</Txt>"),
 ("<Txt v=\"small\">{nameOf(rootOf(tasks, c.task_id))} · {isDue(c, now) ? 'due now' : c.interval ? `every ${fmtInterval(c.interval)}` : 'new'}{c.front_img || c.back_img ? ' · image' : ''}</Txt>", "<Txt v=\"small\" raw>{`${nameOf(rootOf(tasks, c.task_id))} · ${isDue(c, now) ? tr('due now') : c.interval ? tr('every {t}', { t: fmtInterval(c.interval) }) : tr('new')}${c.front_img || c.back_img ? ` · ${tr('image')}` : ''}`}</Txt>"),
 ("<Txt v=\"h3\">{nameOf(id)}</Txt><Txt v=\"small\" c={x.due ? t.accentText : t.muted}>{x.due} due · {x.total} cards</Txt>", "<Txt v=\"h3\" raw>{nameOf(id)}</Txt><Txt v=\"small\" raw c={x.due ? t.accentText : t.muted}>{tr('{due} due · {total} cards', { due: x.due, total: x.total })}</Txt>"),
])

# ---------- Review ----------
sub('src/app/review.tsx', [
 ("import { useSettings } from '../store';", "import { tr } from '../i18n';\nimport { useSettings } from '../store';"),
 ("<Txt v=\"label\">{queue === null ? '' : cur ? `${queue.length} left` : 'Done'}</Txt>", "<Txt v=\"label\">{queue === null ? '' : cur ? tr('{n} left', { n: queue.length }) : 'Done'}</Txt>"),
 ("{total.current === 0 ? 'Come back when cards are due, or add more.' : `${stats.current.done} reviews · ${stats.current.again} to relearn`}", "{total.current === 0 ? 'Come back when cards are due, or add more.' : tr('{done} reviews · {again} to relearn', { done: stats.current.done, again: stats.current.again })}"),
 ("{!!cur.front && <Txt style={{ fontFamily: font.head, fontSize: 26, textAlign: 'center' }}>{cur.front}</Txt>}", "{!!cur.front && <Txt raw style={{ fontFamily: font.head, fontSize: 26, textAlign: 'center' }}>{cur.front}</Txt>}"),
 ("{!!cur.back && <Txt style={{ fontSize: 20, textAlign: 'center', lineHeight: 28 }}>{cur.back}</Txt>}", "{!!cur.back && <Txt raw style={{ fontSize: 20, textAlign: 'center', lineHeight: 28 }}>{cur.back}</Txt>}"),
 ("{!!label(cur) && <Txt v=\"label\" style={{ textAlign: 'center' }}>{label(cur)}</Txt>}", "{!!label(cur) && <Txt v=\"label\" raw style={{ textAlign: 'center' }}>{label(cur)}</Txt>}"),
])

# ---------- Calibrate ----------
sub('src/components/Calibrate.tsx', [
 ("import { useSettings } from '../store';", "import { tr } from '../i18n';\nimport { useSettings } from '../store';"),
 ("text: ok ? `Flip starts at z < ${(result as Thresh).zStart}, stops above ${(result as Thresh).zStop}. Save to use these.` : String(result) },", "text: ok ? tr('Flip starts at z < {a}, stops above {b}. Save to use these.', { a: (result as Thresh).zStart, b: (result as Thresh).zStop }) : tr(String(result)) },"),
 ("<Txt>{rec ? `Recording… ${left}s. Keep it as is.` : b.text}</Txt>", "<Txt>{rec ? tr('Recording… {n}s. Keep it as is.', { n: left }) : b.text}</Txt>"),
])

# ---------- CardEditor ----------
sub('src/components/CardEditor.tsx', [
 ("import { clozeCards } from '../engine/srs';", "import { clozeCards } from '../engine/srs';\nimport { tr } from '../i18n';"),
 ("Alert.alert('Could not add image', String(e))", "Alert.alert(tr('Could not add image'), String(e))"),
 ("label={uri ? `Replace ${side} image` : `+ ${side} image`}", "label={uri ? (side === 'front' ? 'Replace front image' : 'Replace back image') : side === 'front' ? '+ front image' : '+ back image'}"),
 ("placeholder=\"Front, or cloze text like: The {{c1::heart}} pumps {{c2::blood}}\"", "placeholder={tr('Front, or cloze text like: The {{c1::heart}} pumps {{c2::blood}}')}"),
 ("placeholder={cloze ? 'Extra info shown on the answer (optional)' : 'Back (answer)'}", "placeholder={tr(cloze ? 'Extra info shown on the answer (optional)' : 'Back (answer)')}"),
 ("<Txt v=\"small\">Cloze detected: one card is made per blank ({clozeCards(front).length}).</Txt>", "<Txt v=\"small\">{tr('Cloze detected: one card is made per blank ({n}).', { n: clozeCards(front).length })}</Txt>"),
])
