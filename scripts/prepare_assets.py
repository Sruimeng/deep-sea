"""Blender P2 pipeline: retain PBR detail and author timed boxing actions."""
import bpy
import math
import json
import sys
from pathlib import Path
from mathutils import Matrix

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / '.llmdoc-tmp'
OUT = ROOT / 'public/models'
NAMES = ['hero', 'packet', 'spinner', 'guard', 'charger', 'router', 'beijing', 'shanghai', 'hangzhou', 'california', 'shenzhen']
sys.path.insert(0, str(ROOT / 'scripts'))
from hero_motion import ACTIONS, animate


def clean_import(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = RAW / (name + '-p2' + ('-rig' if name == 'hero' else '') + '.glb')
    bpy.ops.import_scene.gltf(filepath=str(path))
    for obj in list(bpy.context.scene.objects):
        if obj.type not in {'MESH', 'ARMATURE', 'EMPTY'} or obj.name == 'Icosphere':
            bpy.data.objects.remove(obj, do_unlink=True)
    for image in bpy.data.images:
        limit = 2048 if name in {'hero', 'router'} else 1536
        if image.type == 'IMAGE' and max(image.size) > limit:
            ratio = limit / max(image.size)
            image.scale(max(1, int(image.size[0] * ratio)), max(1, int(image.size[1] * ratio)))
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for face in obj.data.polygons:
                face.use_smooth = True


def export(name):
    bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB',
        export_image_format='AUTO', export_jpeg_quality=90,
        export_animations=name == 'hero', export_animation_mode='NLA_TRACKS',
        export_nla_strips=True, export_force_sampling=True, export_def_bones=True,
        export_current_frame=False)


manifest = {'source': 'Tripo P2-20260801 via public v3 API', 'processing': 'Blender 5.2; original P2 geometry retained, PBR preserved, 1536px textures / hero and boss 2048px', 'models': []}
tasks = json.loads((RAW / 'tripo-tasks.json').read_text())
selected = NAMES
if '--only' in sys.argv:
    selected = [sys.argv[sys.argv.index('--only') + 1]]
    if selected[0] not in NAMES: raise ValueError('Unknown model')
    if (ROOT / 'art/manifest.json').exists():
        manifest = json.loads((ROOT / 'art/manifest.json').read_text())
        manifest['models'] = [model for model in manifest['models'] if model['name'] not in selected]
for name in selected:
    path = RAW / (name + '-p2' + ('-rig' if name == 'hero' else '') + '.glb')
    if not path.exists():
        print('PENDING', name, flush=True)
        continue
    clean_import(name)
    if name == 'hero':
        arm = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
        animate(arm)
    # Source front +X becomes glTF +Z for the gameplay facing convention.
    for obj in bpy.context.scene.objects:
        if obj.parent is None:
            obj.matrix_world = Matrix.Rotation(-math.pi / 2, 4, 'Z') @ obj.matrix_world
    export(name)
    faces = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    manifest['models'].append({'name': name, 'file': '/models/' + name + '.glb', 'model': 'P2-20260801', 'task_id': tasks[name + '-p2'], 'rig_task_id': tasks.get('hero-p2-rig') if name == 'hero' else None, 'bytes': (OUT / (name + '.glb')).stat().st_size, 'faces': faces, 'animations': list(ACTIONS) if name == 'hero' else []})
    if name == 'hero':
        for track in arm.animation_data.nla_tracks: track.mute = track.name != 'idle'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art' / (name + '.blend')))
    print('PREPARED', name, faces, (OUT / (name + '.glb')).stat().st_size, flush=True)
(ROOT / 'art/manifest.json').write_text(json.dumps(manifest, indent=2))
