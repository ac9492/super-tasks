import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { ISSUE_PROVIDER_HUMANIZED, ISSUE_PROVIDER_ICON_MAP } from '../issue.const';
import { BuiltInIssueProviderKey, IssueProviderKey } from '../issue.model';
import { PluginIssueProviderRegistryService } from '../../../plugins/issue-provider/plugin-issue-provider-registry.service';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';

@Component({
  selector: 'issue-header',
  templateUrl: './issue-header.component.html',
  styleUrls: ['./issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, TranslatePipe],
})
export class IssueHeaderComponent {
  readonly T = T;
  private _pluginRegistry = inject(PluginIssueProviderRegistryService);

  task = input.required<TaskWithSubTasks>();

  icon = computed(() => {
    const key = this.task().issueType as IssueProviderKey;
    if (!key) return '';
    if (this._pluginRegistry.hasProvider(key)) {
      return this._pluginRegistry.getSvgIcon(key);
    }
    return ISSUE_PROVIDER_ICON_MAP[key as BuiltInIssueProviderKey];
  });

  providerName = computed(() => {
    const key = this.task().issueType as IssueProviderKey;
    if (!key) return '';
    if (this._pluginRegistry.hasProvider(key)) {
      return this._pluginRegistry.getName(key);
    }
    return ISSUE_PROVIDER_HUMANIZED[key as BuiltInIssueProviderKey];
  });
}
