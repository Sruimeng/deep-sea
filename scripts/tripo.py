"""Development-only asset tasks. Credentials stay in .env.tripo."""
import argparse
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent.parent
TASKS = ROOT / '.llmdoc-tmp' / 'tripo-tasks.json'


def api(path, payload=None):
    key = os.environ.get('TRIPO_API_KEY')
    if not key:
        key = (ROOT / '.env.tripo').read_text().strip().split('=', 1)[1]
    data = json.dumps(payload).encode() if payload else None
    request = Request('https://openapi.tripo3d.ai/v3/' + path, data=data,
                      headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=60) as response:
            result = json.load(response)
    except HTTPError as error:
        details = json.loads(error.read())
        raise RuntimeError(f'Tripo HTTP {error.code}: {details.get("message") or details.get("error") or details.get("data")}') from None
    if result['code'] != 0:
        raise RuntimeError(f"Tripo returned code {result['code']}")
    return result['data']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['generate', 'status', 'rig', 'download'])
    parser.add_argument('name')
    parser.add_argument('--prompt')
    parser.add_argument('--model', default='P2-20260801')
    parser.add_argument('--faces', type=int, default=24000)
    args = parser.parse_args()
    tasks = json.loads(TASKS.read_text()) if TASKS.exists() else {}
    manifest = ROOT / 'art' / 'manifest.json'
    if not tasks and manifest.exists():
        for model in json.loads(manifest.read_text())['models']:
            name = model['name'] + ('-p2' if model.get('model') == 'P2-20260801' else '')
            tasks[name] = model['task_id']
            if model.get('rig_task_id'):
                tasks[name + '-rig'] = model['rig_task_id']
    TASKS.parent.mkdir(exist_ok=True)
    if tasks and not TASKS.exists():
        TASKS.write_text(json.dumps(tasks, indent=2))
    if args.action == 'generate':
        if not args.prompt:
            parser.error('--prompt is required for generation')
        if args.name in tasks:
            raise RuntimeError('Task already exists; inspect status before spending more credits.')
        payload = dict(model=args.model,
                       prompt=args.prompt, face_limit=args.faces, texture=True, pbr=True, texture_quality='detailed')
        tasks[args.name] = api('generation/text-to-model', payload)['task_id']
        TASKS.parent.mkdir(exist_ok=True)
        TASKS.write_text(json.dumps(tasks, indent=2))
        print(args.name, tasks[args.name])
    elif args.action == 'rig':
        name = args.name + '-rig'
        if name in tasks:
            raise RuntimeError('Rig task already exists.')
        tasks[name] = api('animations/rig', dict(input=tasks[args.name], model='v1.0-20240301', rig_type='biped', spec='tripo', out_format='glb'))['task_id']
        TASKS.write_text(json.dumps(tasks, indent=2))
        print(name, tasks[name])
    else:
        result = api('tasks/' + tasks[args.name])
        print(args.name, result['status'], result.get('progress', 0))
        if result['status'] != 'success':
            return
        output = result['output']
        print('Available outputs:', ', '.join(output))
        if args.action == 'download':
            url = output.get('model_url') or output.get('model') or output.get('pbr_model') or output.get('base_model')
            if isinstance(url, dict):
                url = url['url']
            target = ROOT / '.llmdoc-tmp' / (args.name + '.glb')
            with urlopen(url, timeout=120) as response:
                target.write_bytes(response.read())
            print(target.name, target.stat().st_size)


if __name__ == '__main__':
    main()
