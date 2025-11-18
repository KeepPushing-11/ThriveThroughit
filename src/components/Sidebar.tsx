import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { 
  BarChart3, 
  Brain, 
  Heart, 
  Users, 
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen
} from "lucide-react";

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  surveyStatus: {
    aiReadiness: 'not-started' | 'in-progress' | 'completed';
    leadership: 'not-started' | 'in-progress' | 'completed';
    employeeExperience: 'not-started' | 'in-progress' | 'completed';
  };
  isAdmin?: boolean;
  availableModules?: string[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'in-progress':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In Progress';
    default:
      return 'Not Started';
  }
};

export function Sidebar({ 
  activeModule, 
  onModuleChange, 
  surveyStatus, 
  isAdmin = false, 
  availableModules = ['ai-readiness', 'leadership', 'employee-experience'] 
}: SidebarProps) {
  
  const allNavigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      description: 'Dashboard summary',
      alwaysShow: true
    },
    {
      id: 'ai-readiness',
      label: 'AI Readiness',
      icon: Brain,
      description: 'Technology adoption assessment',
      status: surveyStatus.aiReadiness,
      requiresModule: 'ai-readiness'
    },
    {
      id: 'employee-experience',
      label: 'Employee Experience',
      icon: Heart,
      description: 'Workplace satisfaction metrics',
      status: surveyStatus.employeeExperience,
      requiresModule: 'employee-experience'
    },
    {
      id: 'leadership',
      label: 'Leadership',
      icon: Users,
      description: 'Leadership effectiveness analysis',
      status: surveyStatus.leadership,
      requiresModule: 'leadership'
    },
    ...(isAdmin ? [
      {
        id: 'survey-management',
        label: 'Survey Management',
        icon: FolderOpen,
        description: 'Create and manage client surveys',
        alwaysShow: true
      }
    ] : []),
    
  ];

  // Filter navigation items based on available modules
  const navigationItems = allNavigationItems.filter(item => {
    if (item.alwaysShow) return true;
    if (item.requiresModule) {
      return availableModules.includes(item.requiresModule);
    }
    return true;
  });

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">LEAP</h2>
            <p className="text-xs text-gray-500">Analytics Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          
          return (
              <Button
              key={item.id}
              variant="ghost"
              onClick={() => !(item as any).disabled && onModuleChange(item.id)}
              disabled={(item as any).disabled}
              className={cn(
                "w-full justify-start h-auto p-3 text-left",
                isActive 
                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                  : "hover:bg-gray-50",
                (item as any).disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-blue-600" : "text-gray-500"
                )} />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm",
                    isActive ? "text-blue-700" : "text-gray-900"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {item.description}
                  </div>
                  {item.status && (
                    <div className="flex items-center gap-1 mt-1">
                      {getStatusIcon(item.status)}
                      <span className="text-xs text-gray-600">
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Last Updated</div>
          <div className="text-sm font-medium text-gray-900">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}