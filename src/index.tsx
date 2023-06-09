import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  useNavigation,
  launchCommand,
  LaunchType,
  confirmAlert,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { useAtom } from "jotai";
import { getProgressIcon } from "@raycast/utils";
import TaskForm from "./components/taskForm";
import MinForm from "./components/minForm";
import { dataAtom, activeIdAtom } from "./common/atoms";
import { taskListType } from "./common/types";

export default function Command() {
  const { push } = useNavigation();

  const [DATA, SetData] = useAtom(dataAtom);
  const [ACTIVEID, SetActiveId] = useAtom(activeIdAtom);

  const Save = (id: string, d: taskListType) => {
    SetActiveId(id);
    SetData(d);
  };

  // Item Actions
  const onStart = (id: string) => {
    if (id == ACTIVEID) {
      return;
    }
    const d = JSON.parse(JSON.stringify(DATA));
    for (const i in d) {
      if (d[i].id == id) {
        const taskDuration = Number(d[i].duration);
        const taskMin = Math.floor(d[i].sec / 60);
        if (taskMin >= taskDuration) {
          return;
        }
        d[i].ts = Math.ceil(new Date().getTime() / 1000);
        break;
      }
    }
    Save(id, d);
    launchCommand({
      name: "menubar",
      type: LaunchType.UserInitiated,
    });
    popToRoot({ clearSearchBar: true });
    closeMainWindow();
  };
  const onSetTime = (id: string) => {
    push(<MinForm taskId={id} />);
  };
  const onEdit = (id: string) => {
    push(<TaskForm taskId={id} />);
  };
  const onSort = (id: string, action: string) => {
    const d = JSON.parse(JSON.stringify(DATA));
    for (const i in d) {
      if (d[i].id == id) {
        const item = d[i];
        if (action == "down") {
          d.splice(Number(i), 1);
          d.splice(Number(i) + 1, 0, item);
        }
        if (action == "up") {
          d.splice(Number(i), 1);
          d.splice(Number(i) - 1, 0, item);
        }
        break;
      }
    }
    SetData(d);
  };
  const onRemove = async (id: string) => {
    if (
      await confirmAlert({
        title: "Remove the task?",
        message: "Are you sure remove the task?",
      })
    ) {
      const d = JSON.parse(JSON.stringify(DATA));
      for (const i in d) {
        if (d[i].id == id) {
          d.splice(Number(i), 1);
          break;
        }
      }
      SetData(d);
      if (id == ACTIVEID) {
        launchCommand({
          name: "pause",
          type: LaunchType.UserInitiated,
        });
      }
    }
  };
  // Global Actions
  const onAdd = () => {
    push(<TaskForm taskId="add" />);
  };
  const onReset = async () => {
    if (
      await confirmAlert({
        title: "Reset All Task Progress?",
        message: "Are you sure reset all task progress?",
      })
    ) {
      const d = JSON.parse(JSON.stringify(DATA));
      for (const i in d) {
        d[i].sec = 0;
        d[i].ts = 0;
      }
      Save("", d);
      launchCommand({
        name: "menubar",
        type: LaunchType.UserInitiated,
      });
    }
  };

  const items = DATA.map((task, index) => {
    const taskColor: Color = task.color as Color;
    const taskIcon: Icon = task.icon as Icon;
    let accessories;
    if (!task.disabled) {
      const taskDuration = Number(task.duration);
      const taskMin = Math.floor(task.sec / 60);
      if (ACTIVEID == task.id) {
        accessories = [
          { tag: { value: taskMin + "/" + taskDuration, color: Color.Green } },
          { icon: { source: getProgressIcon(taskMin / taskDuration, Color.Green) } },
        ];
      } else if (taskMin >= taskDuration) {
        accessories = [{ tag: String(taskDuration) }, { icon: { source: Icon.Check, tintColor: Color.Green } }];
      } else {
        accessories = [
          { tag: taskMin + "/" + taskDuration },
          { icon: { source: getProgressIcon(taskMin / taskDuration, "#999999") } },
        ];
      }
    }
    return (
      <List.Item
        key={task.id}
        title={task.title}
        subtitle={task.desc}
        icon={{ source: taskIcon, tintColor: task.disabled ? "#999999" : taskColor }}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Current Task">
              {!task.disabled && (
                <Action
                  title="Start"
                  autoFocus
                  icon={{ source: Icon.Play, tintColor: Color.Green }}
                  onAction={() => {
                    onStart(task.id);
                  }}
                />
              )}
              {!task.disabled && (
                <Action
                  title="Set Time"
                  shortcut={{ modifiers: ["opt"], key: "t" }}
                  icon={{ source: Icon.Clock }}
                  onAction={() => {
                    onSetTime(task.id);
                  }}
                />
              )}
              <Action
                title="Edit"
                shortcut={{ modifiers: ["opt"], key: "e" }}
                icon={{ source: Icon.Text }}
                onAction={() => {
                  onEdit(task.id);
                }}
              />
              {index != 0 && (
                <Action
                  title="Sort Up"
                  shortcut={{ modifiers: ["ctrl", "opt"], key: "arrowUp" }}
                  icon={{ source: Icon.ChevronUp }}
                  onAction={() => {
                    onSort(task.id, "up");
                  }}
                />
              )}
              {index != DATA.length - 1 && (
                <Action
                  title="Sort Down"
                  shortcut={{ modifiers: ["ctrl", "opt"], key: "arrowDown" }}
                  icon={{ source: Icon.ChevronDown }}
                  onAction={() => {
                    onSort(task.id, "down");
                  }}
                />
              )}
              <Action
                title="Remove"
                shortcut={{ modifiers: ["opt"], key: "x" }}
                icon={{ source: Icon.Trash }}
                style={Action.Style.Destructive}
                onAction={() => {
                  onRemove(task.id);
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="More">
              <Action
                title="Add"
                shortcut={{ modifiers: ["opt"], key: "a" }}
                icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
                onAction={onAdd}
              />
              <Action
                title="Reset"
                shortcut={{ modifiers: ["opt"], key: "r" }}
                icon={{ source: Icon.RotateAntiClockwise, tintColor: Color.Red }}
                onAction={onReset}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List>
      <List.EmptyView
        icon={Icon.Code}
        title="Empty Data"
        description="you can type Enter to add a task"
        actions={
          <ActionPanel>
            <Action title="Add" autoFocus icon={{ source: Icon.PlusCircle, tintColor: Color.Green }} onAction={onAdd} />
          </ActionPanel>
        }
      />
      {items}
    </List>
  );
}
