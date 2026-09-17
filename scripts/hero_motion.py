"""Authored combat poses with planted-foot two-bone IK."""
from dataclasses import dataclass, fields, replace
import math
import bpy
from mathutils import Matrix, Vector, Quaternion

ACTIONS = {'idle': 96, 'run': 36, 'jab': 18, 'cross': 18, 'uppercut': 27,
           'kick': 25, 'special': 42, 'dash': 18, 'jump': 36, 'hurt': 22,
           'fall': 36, 'sweep': 33, 'lunge': 23, 'land': 16}

@dataclass
class Pose:
    hip: tuple = (0, 0, -0.055)
    lean: float = 0.13
    pelvis: float = -0.12
    chest: float = 0.18
    spin: float = 0
    left: tuple = (0.065, 0.125, 0.735)
    right: tuple = (0.01, -0.125, 0.76)
    left_foot: tuple = (0.035, 0.155, 0.048)
    right_foot: tuple = (-0.205, -0.17, 0.05)
    left_fist: tuple = (1, 0, 0)
    right_fist: tuple = (1, 0, 0)

GUARD = Pose()
def pose(**values): return replace(GUARD, **values)
def ease(t):
    t = max(0, min(1, t))
    return t * t * (3 - 2 * t)

def blend(a, b, t):
    result = {}
    for field in fields(Pose):
        first, second = getattr(a, field.name), getattr(b, field.name)
        result[field.name] = tuple(x + (y - x) * t for x, y in zip(first, second)) if isinstance(first, tuple) else first + (second - first) * t
    return Pose(**result)

KEYS = {
    'jab': [(0, GUARD), (.12, pose(hip=(-.018, 0, -.07), chest=.3, left=(.015, .13, .72))),
            (.26, pose(hip=(.025, .008, -.045), chest=-.45, pelvis=-.3, left=(.31, .07, .7), left_foot=(.085, .155, .048))),
            (.36, pose(hip=(.025, .008, -.045), chest=-.45, pelvis=-.3, left=(.31, .07, .7), left_foot=(.085, .155, .048))),
            (.68, pose(left=(.09,.11,.73), chest=-.1)), (1, GUARD)],
    'cross': [(0, GUARD), (.12, pose(hip=(-.025, -.008, -.075), chest=-.35, right=(-.035,-.15,.71))),
              (.26, pose(hip=(.045, -.006, -.035), chest=.72, pelvis=.38, lean=.2, right=(.32,-.045,.69), right_foot=(-.14,-.17,.073))),
              (.38, pose(hip=(.045, -.006, -.035), chest=.72, pelvis=.38, lean=.2, right=(.32,-.045,.69), right_foot=(-.14,-.17,.073))),
              (.73, pose(chest=.3, right=(.075,-.12,.73))), (1, GUARD)],
    'uppercut': [(0, GUARD), (.14, pose(hip=(-.015,0,-.115), lean=.22, chest=-.32, right=(.015,-.16,.51))),
                 (.30, pose(hip=(.035,0,-.01), lean=-.14, chest=.6, pelvis=.3, right=(.17,-.09,.87), right_fist=(.35,0,1), right_foot=(-.15,-.17,.095))),
                 (.4, pose(hip=(.035,0,-.01), lean=-.14, chest=.6, pelvis=.3, right=(.17,-.09,.87), right_fist=(.35,0,1), right_foot=(-.15,-.17,.095))),
                 (.7, pose(hip=(0,0,-.085), right=(.08,-.12,.77))), (1, GUARD)],
    'kick': [(0, pose(hip=(0,0,-.045), right_foot=(.035,-.14,.3), left_foot=(-.17,.15,.15), lean=-.2)),
             (.2, pose(hip=(.015,0,-.03), lean=-.3, right_foot=(.37,-.09,.51), left_foot=(-.16,.16,.22), left=(.005,.21,.72), right=(-.03,-.2,.72))),
             (.36, pose(hip=(.015,0,-.03), lean=-.3, right_foot=(.37,-.09,.51), left_foot=(-.16,.16,.22), left=(.005,.21,.72), right=(-.03,-.2,.72))),
             (.7, pose(right_foot=(.06,-.15,.28), left_foot=(-.12,.15,.14))), (1, GUARD)],
    'sweep': [(0, GUARD), (.16, pose(hip=(0,0,-.075), chest=-.5, right_foot=(-.06,-.17,.27), spin=-.45)),
              (.37, pose(hip=(0,0,-.055), lean=-.18, chest=.4, right_foot=(.36,-.07,.4), right=(-.02,-.22,.69), left=(.03,.2,.74), spin=.3)),
              (.62, pose(hip=(0,0,-.05), right_foot=(.19,.1,.33), left=(.01,.2,.73), spin=3.8)),
              (.83, pose(hip=(0,0,-.1), spin=math.tau)), (1, pose(spin=math.tau))],
    'lunge': [(0, pose(hip=(-.035,0,-.09), lean=.3, right=(-.02,-.15,.65))),
              (.24, pose(hip=(.07,0,-.035), lean=.32, chest=.6, pelvis=.35, right=(.38,-.06,.65), left_foot=(.19,.15,.05), right_foot=(-.25,-.17,.065))),
              (.42, pose(hip=(.07,0,-.035), lean=.32, chest=.6, pelvis=.35, right=(.38,-.06,.65), left_foot=(.19,.15,.05), right_foot=(-.25,-.17,.065))),
              (.75, pose(hip=(.015,0,-.085), left_foot=(.1,.15,.05))), (1, GUARD)],
    'special': [(0, GUARD), (.13, pose(hip=(0,0,-.03), lean=-.2, left=(.04,.12,.93), right=(.04,-.12,.93))),
                (.28, pose(hip=(.015,0,-.145), lean=.42, left=(.17,.12,.43), right=(.17,-.12,.43), left_foot=(.07,.2,.05), right_foot=(-.16,-.22,.05))),
                (.43, pose(hip=(.015,0,-.145), lean=.42, left=(.17,.12,.43), right=(.17,-.12,.43), left_foot=(.07,.2,.05), right_foot=(-.16,-.22,.05))),
                (.76, pose(hip=(0,0,-.08))), (1, GUARD)],
    'land': [(0, pose(hip=(.02,0,-.06))), (.28, pose(hip=(.02,0,-.12), lean=.25, left=(.04,.16,.66), right=(.015,-.16,.69))), (1, GUARD)],
    'hurt': [(0, GUARD), (.2, pose(hip=(-.035,0,-.08), lean=-.3, chest=-.25, left=(-.02,.17,.68), right=(-.07,-.19,.68))), (1, GUARD)],
    'fall': [(0, GUARD), (1, pose(hip=(-.13,0,-.2), lean=-.7, left=(-.1,.25,.6), right=(-.15,-.25,.6)))],
}

def sample(name, t):
    if name == 'idle':
        breath = math.sin(t * math.tau)
        return pose(hip=(0, breath*.006, -.057 + breath*.005), lean=.13 + breath*.018)
    if name == 'run':
        phase = t * math.tau
        feet = []
        for offset, y in [(0,.15), (math.pi,-.17)]:
            a = phase + offset
            feet.append((-.06 + math.cos(a)*.23, y, .05 + max(0,math.sin(a))*.13))
        swing = math.sin(phase)
        return pose(hip=(.015,0,-.055+abs(swing)*.015), lean=.25, chest=.18-swing*.14,
                    left=(.075-swing*.025,.13,.70), right=(.015+swing*.025,-.13,.73), left_foot=feet[0],right_foot=feet[1])
    if name == 'dash':
        return pose(hip=(.04,0,-.08), lean=.4, chest=.28, left=(.09,.12,.69), right=(-.025,-.14,.66), left_foot=(.22,.15,.085),right_foot=(-.28,-.17,.07))
    if name == 'jump':
        tuck = math.sin(t*math.pi)
        return pose(hip=(0,0,-.045), lean=-.08, left_foot=(-.06,.15,.05+tuck*.21), right_foot=(-.14,-.17,.05+tuck*.25),left=(.025,.18,.75),right=(-.015,-.18,.77))
    keys = KEYS[name]
    for (at,a),(bt,b) in zip(keys,keys[1:]):
        if t <= bt: return blend(a,b,ease((t-at)/(bt-at)))
    return keys[-1][1]

def rotate(arm, name, axis, angle):
    bone = arm.pose.bones[name]
    axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    bone.rotation_quaternion = Quaternion(axis.normalized(), angle)

def aim(arm, name, direction):
    bone = arm.pose.bones[name]
    bpy.context.view_layer.update()
    rest = bone.bone.matrix_local.to_3x3()
    parent = bone.parent.matrix.to_3x3() @ bone.parent.bone.matrix_local.to_3x3().inverted() if bone.parent else Matrix.Identity(3)
    desired = parent.inverted() @ Vector(direction).normalized()
    delta = (rest @ Vector((0,1,0))).rotation_difference(desired)
    bone.rotation_quaternion = (rest.inverted() @ delta.to_matrix() @ rest).to_quaternion()

def limb(arm, upper, lower, target, pole):
    bpy.context.view_layer.update()
    first, second = arm.pose.bones[upper], arm.pose.bones[lower]
    start = first.head.copy()
    delta = target-start
    length = max(.001,min(delta.length,first.length+second.length-.001))
    direction = delta.normalized()
    a = (first.length**2-second.length**2+length**2)/(2*length)
    bend = (pole-direction*pole.dot(direction)).normalized()
    knee = start + direction*a + bend*math.sqrt(max(0,first.length**2-a*a))
    aim(arm,upper,knee-start)
    bpy.context.view_layer.update()
    aim(arm,lower,start+direction*length-arm.pose.bones[lower].head)

def apply_pose(arm, p):
    for bone in arm.pose.bones:
        bone.rotation_mode='QUATERNION'
        bone.rotation_quaternion=Quaternion()
        bone.location=(0,0,0)
    rotate(arm,'Root',(0,0,1),p.spin)
    hip=arm.pose.bones['Hip']
    hip.location=hip.bone.matrix_local.to_3x3().inverted() @ Vector(p.hip)
    rotate(arm,'Pelvis',(0,0,1),p.pelvis)
    rotate(arm,'Waist',(0,0,1),p.chest*.25)
    rotate(arm,'Spine01',(0,1,0),p.lean)
    rotate(arm,'Spine02',(0,0,1),p.chest*.75)
    rotate(arm,'Head',(0,0,1),-p.chest*.45)
    rotation=Matrix.Rotation(p.spin,3,'Z')
    pivot=arm.data.bones['Root'].head_local
    world=lambda value:pivot+rotation@(Vector(value)-pivot)
    for side,sign in [('L',1),('R',-1)]:
        foot=p.left_foot if side=='L' else p.right_foot
        wrist=p.left if side=='L' else p.right
        fist=p.left_fist if side=='L' else p.right_fist
        limb(arm,side+'_Thigh',side+'_Calf',world(foot),rotation@Vector((1,sign*.12,0)))
        aim(arm,side+'_Foot',rotation@Vector((1,sign*.08,-.05)))
        limb(arm,side+'_Upperarm',side+'_Forearm',world(wrist),rotation@Vector((-.2,sign*.7,-1)))
        aim(arm,side+'_Hand',rotation@Vector(fist))

def animate(arm):
    arm.animation_data_create()
    for track in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(track)
    arm.animation_data.action=None
    for action in list(bpy.data.actions): bpy.data.actions.remove(action)
    for name,frames in ACTIONS.items():
        action=bpy.data.actions.new(name)
        arm.animation_data.action=action
        for frame in range(1,frames+1):
            apply_pose(arm,sample(name,(frame-1)/(frames-1)))
            for bone in arm.pose.bones:
                bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
                if bone.name=='Hip':bone.keyframe_insert(data_path='location',frame=frame,group=bone.name)
        arm.animation_data.action=None
        track=arm.animation_data.nla_tracks.new()
        track.name=name
        track.strips.new(name,1,action)
        track.mute=True
    for bone in arm.pose.bones:
        bone.rotation_quaternion=Quaternion()
        bone.location=(0,0,0)
    for track in arm.animation_data.nla_tracks:track.mute=False
    bpy.context.scene.render.fps=60
    bpy.context.scene.frame_set(1)
